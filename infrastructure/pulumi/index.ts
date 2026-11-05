import * as fs from "fs";
import * as path from "path";
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

/**
 * SecureBank AWS infrastructure.
 *
 * This is a direct AWS translation of the previous Azure design: one public
 * subnet, one Ubuntu application VM, a static public IP and a security group
 * that only exposes HTTPS (plus HTTP in QA and SSH from an approved CIDR).
 * The application remains a modular monolith deployed with Docker Compose.
 */

function fail(message: string): never {
  throw new Error(message);
}

function assertCidr(name: string, value: string): void {
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\/(\d{1,2})$/.exec(value);
  if (!match) {
    fail(`${name} must be a valid IPv4 CIDR (for example 10.20.0.0/16).`);
  }
  const octets = match.slice(1, 5).map(Number);
  const prefix = Number(match[5]);
  if (octets.some((octet) => octet < 0 || octet > 255) || prefix < 0 || prefix > 32) {
    fail(`${name} must be a valid IPv4 CIDR (for example 10.20.0.0/16).`);
  }
}

const config = new pulumi.Config();
const awsConfig = new pulumi.Config("aws");

const projectName = config.get("projectName") ?? "securebank";
const environment = config.get("environment") ?? "qa";
const vpcCidr = config.get("vpcCidr") ?? "10.20.0.0/16";
const subnetCidr = config.get("subnetCidr") ?? "10.20.10.0/24";
const instanceType = config.get("instanceType") ?? "t3.medium";
const allowedSshCidr = config.get("allowedSshCidr")?.trim() || undefined;
const sshPublicKey = config.require("sshPublicKey").trim();
const region = awsConfig.get("region") ?? process.env.AWS_REGION ?? "us-east-1";

if (!/^[a-z][a-z0-9-]{1,20}$/.test(projectName)) {
  fail("projectName must start with a letter and contain only lowercase letters, numbers or hyphens (2-21 characters).");
}
if (environment !== "qa" && environment !== "prod") {
  fail("environment must be qa or prod.");
}
if (!/^[a-z][a-z0-9-]*\.[a-z0-9]+$/.test(instanceType)) {
  fail("instanceType must be a valid EC2 instance type such as t3.medium.");
}
if (!/^(ssh-(rsa|ed25519)|ecdsa-sha2-nistp(256|384|521))\s+/.test(sshPublicKey)) {
  fail("sshPublicKey must be a valid OpenSSH public key (ssh-ed25519, ssh-rsa or ecdsa).");
}
assertCidr("vpcCidr", vpcCidr);
assertCidr("subnetCidr", subnetCidr);
if (allowedSshCidr) {
  assertCidr("allowedSshCidr", allowedSshCidr);
  if (allowedSshCidr === "0.0.0.0/0" || allowedSshCidr === "::/0") {
    fail("allowedSshCidr must not be open to the whole internet.");
  }
}

const isQa = environment === "qa";
const resourcePrefix = `${projectName}-${environment}`;
const tags: { [key: string]: string } = {
  project: projectName,
  environment,
  managed_by: "pulumi",
};

// ---------------------------------------------------------------------------
// Network: VPC, public subnet, internet gateway and route table.
// ---------------------------------------------------------------------------

const vpc = new aws.ec2.Vpc("securebank-vpc", {
  cidrBlock: vpcCidr,
  enableDnsHostnames: true,
  enableDnsSupport: true,
  tags: { ...tags, Name: `${resourcePrefix}-vpc` },
});

const internetGateway = new aws.ec2.InternetGateway("securebank-igw", {
  vpcId: vpc.id,
  tags: { ...tags, Name: `${resourcePrefix}-igw` },
});

const publicSubnet = new aws.ec2.Subnet("securebank-public-subnet", {
  vpcId: vpc.id,
  cidrBlock: subnetCidr,
  mapPublicIpOnLaunch: true,
  tags: { ...tags, Name: `${resourcePrefix}-public` },
});

const routeTable = new aws.ec2.RouteTable("securebank-public-rt", {
  vpcId: vpc.id,
  tags: { ...tags, Name: `${resourcePrefix}-public-rt` },
});

new aws.ec2.Route("securebank-internet-route", {
  routeTableId: routeTable.id,
  destinationCidrBlock: "0.0.0.0/0",
  gatewayId: internetGateway.id,
});

new aws.ec2.RouteTableAssociation("securebank-public-rta", {
  subnetId: publicSubnet.id,
  routeTableId: routeTable.id,
});

// ---------------------------------------------------------------------------
// Security group: HTTPS always; HTTP only in QA; SSH only from an approved CIDR.
// ---------------------------------------------------------------------------

const ingress: aws.types.input.ec2.SecurityGroupIngress[] = [
  {
    protocol: "tcp",
    fromPort: 443,
    toPort: 443,
    cidrBlocks: ["0.0.0.0/0"],
    description: "HTTPS from the internet",
  },
];

if (isQa) {
  ingress.push({
    protocol: "tcp",
    fromPort: 80,
    toPort: 80,
    cidrBlocks: ["0.0.0.0/0"],
    description: "HTTP for QA while TLS is validated",
  });
}

if (allowedSshCidr) {
  ingress.push({
    protocol: "tcp",
    fromPort: 22,
    toPort: 22,
    cidrBlocks: [allowedSshCidr],
    description: "SSH from the approved administrator CIDR",
  });
}

const securityGroup = new aws.ec2.SecurityGroup("securebank-app-sg", {
  name: `${resourcePrefix}-app`,
  vpcId: vpc.id,
  description: "SecureBank application security group",
  ingress,
  egress: [
    {
      protocol: "-1",
      fromPort: 0,
      toPort: 0,
      cidrBlocks: ["0.0.0.0/0"],
      description: "Allow all outbound traffic",
    },
  ],
  tags: { ...tags, Name: `${resourcePrefix}-app` },
});

// ---------------------------------------------------------------------------
// SSH key pair and Ubuntu 24.04 instance with a 30 GB gp3 root volume.
// ---------------------------------------------------------------------------

const keyPair = new aws.ec2.KeyPair("securebank-app-key", {
  keyName: `${resourcePrefix}-app`,
  publicKey: sshPublicKey,
  tags: { ...tags, Name: `${resourcePrefix}-app` },
});

const ubuntu = aws.ec2.getAmiOutput({
  mostRecent: true,
  owners: ["099720109477"], // Canonical
  filters: [
    { name: "name", values: ["ubuntu/images/hvm-ssd*/ubuntu-noble-24.04-amd64-server-*"] },
    { name: "virtualization-type", values: ["hvm"] },
    { name: "root-device-type", values: ["ebs"] },
    { name: "architecture", values: ["x86_64"] },
  ],
});

const cloudInitCandidates = [
  path.join(__dirname, "cloud-init.yaml"),
  path.join(process.cwd(), "cloud-init.yaml"),
];
const cloudInitPath = cloudInitCandidates.find((candidate) => fs.existsSync(candidate))
  ?? fail("cloud-init.yaml was not found next to the Pulumi program.");
const userData = fs.readFileSync(cloudInitPath, "utf8");

const instance = new aws.ec2.Instance("securebank-app", {
  ami: ubuntu.id,
  instanceType,
  subnetId: publicSubnet.id,
  vpcSecurityGroupIds: [securityGroup.id],
  keyName: keyPair.keyName,
  userData,
  userDataReplaceOnChange: true,
  rootBlockDevice: {
    volumeSize: 30,
    volumeType: "gp3",
    deleteOnTermination: true,
    encrypted: true,
  },
  metadataOptions: {
    httpEndpoint: "enabled",
    httpTokens: "required", // IMDSv2 only
    httpPutResponseHopLimit: 2,
  },
  tags: { ...tags, Name: `${resourcePrefix}-app` },
});

// Static Elastic IP, equivalent to the Azure Standard public IP.
const elasticIp = new aws.ec2.Eip("securebank-app-eip", {
  domain: "vpc",
  tags: { ...tags, Name: `${resourcePrefix}-app` },
});

new aws.ec2.EipAssociation("securebank-app-eip-association", {
  allocationId: elasticIp.id,
  instanceId: instance.id,
});

// ---------------------------------------------------------------------------
// Outputs
// ---------------------------------------------------------------------------

export const awsRegion = region;
export const vpcId = vpc.id;
export const publicSubnetId = publicSubnet.id;
export const securityGroupId = securityGroup.id;
export const publicIpAddress = elasticIp.publicIp;
export const applicationUrl = elasticIp.publicIp.apply((ip) => `${isQa ? "http" : "https"}://${ip}`);
export const sshCommand = elasticIp.publicIp.apply((ip) => `ssh ubuntu@${ip}`);
export const vmSize = instance.instanceType;
export const ansibleInventoryHint = elasticIp.publicIp.apply(
  (ip) => `securebank-${environment}:\n  ansible_host: ${ip}\n  ansible_user: ubuntu\n`,
);
