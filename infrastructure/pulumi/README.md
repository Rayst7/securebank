# Pulumi para AWS

Infraestructura **activa** de SecureBank. Pulumi/TypeScript crea una VPC con una
subred pública, una instancia Ubuntu 24.04, una IP elástica y un security group
que expone HTTPS (y HTTP solo en QA) y SSH únicamente desde un CIDR autorizado.
El backend sigue siendo un monolito modular desplegado con Docker Compose y
Ansible; no se crean microservicios ni servicios administrados de datos.

El módulo anterior `infrastructure/terraform` se conserva como **legado y
referencia** del diseño Azure. No es la ruta de despliegue activa.

## Recursos

- `aws:ec2/vpc:Vpc` `10.20.0.0/16`.
- `aws:ec2/subnet:Subnet` pública `10.20.10.0/24` con IP pública automática.
- `aws:ec2/internetGateway:InternetGateway` y tabla de rutas con salida
  `0.0.0.0/0`.
- `aws:ec2/securityGroup:SecurityGroup`:
  - `443/tcp` desde `0.0.0.0/0`.
  - `80/tcp` desde `0.0.0.0/0` solo con `environment=qa`.
  - `22/tcp` solo desde `allowedSshCidr`; nunca `0.0.0.0/0`.
  - Egreso completo.
- `aws:ec2/keyPair:KeyPair` con la clave pública `~/.ssh/securebank_qa.pub`.
- `aws:ec2/instance:Instance` Ubuntu 24.04, `t3.medium`, 30 GB gp3 cifrado,
  IMDSv2 obligatorio.
- `aws:ec2/eip:Eip` + `EipAssociation` para una IP pública estática.
- `cloud-init` instala `python3`, `python3-apt`, `ca-certificates` y deshabilita
  autenticación SSH por contraseña.

## Prerrequisitos

- Node.js 22 y npm 10+.
- Pulumi CLI 3.27x (validado con 3.274.0).
- AWS CLI autenticado con `aws login` en el perfil `default`; no se requieren
  usuarios IAM ni claves de acceso permanentes.
- Clave SSH dedicada en `~/.ssh/securebank_qa` (la privada nunca se versiona).

Verifique la sesión con una llamada real, no solo con `aws configure list`:

```powershell
aws sts get-caller-identity --profile default
```

## Backend y passphrase

El backend por defecto es local (`pulumi login --local`) y el estado queda fuera
del repositorio, en `~/.pulumi`. El backend local exige una passphrase para el
proveedor de secretos. Genere una y guárdela fuera del repositorio; no la
imprima ni la suba a Git:

```powershell
$passFile = Join-Path $HOME ".pulumi\securebank-passphrase"
$env:PULUMI_CONFIG_PASSPHRASE_FILE = $passFile
```

En cada sesión nueva exporte `PULUMI_CONFIG_PASSPHRASE_FILE` con la misma ruta.
Para trabajo compartido configure un backend S3 con bloqueo y un proveedor de
secretos administrado; el backend local no es apto para concurrencia.

## Configuración

```powershell
cd infrastructure/pulumi
npm ci
pulumi login --local
pulumi stack init qa
pulumi config set aws:region us-east-1
pulumi config set projectName securebank
pulumi config set environment qa
pulumi config set vpcCidr 10.20.0.0/16
pulumi config set subnetCidr 10.20.10.0/24
pulumi config set instanceType t3.medium
pulumi config set allowedSshCidr "<IP_ADMIN>/32"
pulumi config set sshPublicKey (Get-Content "$HOME\.ssh\securebank_qa.pub" -Raw).Trim()
```

`Pulumi.qa.yaml` está ignorado por Git. Use `Pulumi.qa.yaml.example` como
referencia. Nunca coloque una clave privada en la configuración.

## Puente de credenciales AWS

Pulumi usa la cadena de credenciales del SDK de AWS. Si el proveedor no consume
directamente la sesión de `aws login`, exporte credenciales temporales en la
misma sesión de shell, sin imprimirlas:

```powershell
$creds = aws configure export-credentials --profile default | ConvertFrom-Json
$env:AWS_ACCESS_KEY_ID = $creds.AccessKeyId
$env:AWS_SECRET_ACCESS_KEY = $creds.SecretAccessKey
$env:AWS_SESSION_TOKEN = $creds.SessionToken
$env:AWS_REGION = "us-east-1"
```

No guarde estas variables en archivos ni en Jenkins como texto plano. En un
agente CI, autentique la sesión con `aws login` o un instance profile y exporte
las credenciales en el mismo paso.

## Validación y preview

```powershell
npm ci
npm run typecheck
pulumi preview --stack qa --non-interactive --diff
```

Resultado verificado el **2026-11-05** con `aws:region=us-east-1`:

- `npm run typecheck`: correcto.
- `pulumi preview`: correcto, **12 recursos a crear** (11 recursos AWS + el
  recurso de stack de Pulumi):
  1. VPC.
  2. Internet Gateway.
  3. Subred pública.
  4. Tabla de rutas.
  5. Ruta a Internet.
  6. Asociación de tabla de rutas.
  7. Security group.
  8. Key pair.
  9. Instancia EC2.
  10. Elastic IP.
  11. Asociación Elastic IP ↔ instancia.
  12. `pulumi:pulumi:Stack` (marcador de estado, no es un recurso AWS).

No se ejecutó `pulumi up` ni se creó ningún recurso en AWS.
`pulumi up` y `pulumi destroy` requieren autorización explícita.

## Salidas

- `awsRegion`
- `vpcId`
- `publicSubnetId`
- `securityGroupId`
- `publicIpAddress`
- `applicationUrl`
- `sshCommand`
- `vmSize`
- `ansibleInventoryHint`

```powershell
pulumi stack output publicIpAddress
pulumi stack output sshCommand
pulumi stack output ansibleInventoryHint
```

## Costos estimados

Precios públicos de AWS `us-east-1` consultados el 2026-11-05, sin impuestos,
créditos ni transferencia de datos:

| Recurso | Precio | Estimado mensual |
|---|---|---|
| `t3.medium` Linux (2 vCPU, 4 GB) | USD 0.0416/hora | ~USD 30.37 |
| EBS gp3 30 GB | USD 0.08/GB-mes | ~USD 2.40 |
| IPv4 pública / Elastic IP | USD 0.005/hora | ~USD 3.65 |
| **Total aproximado** | | **~USD 36.42/mes** |

`t3.large` (2 vCPU, 8 GB) es la opción recomendada si se compilan imágenes en la
VM: cómputo ~USD 60.74/mes, total aproximado **~USD 66.79/mes**. No incluye
egreso de red, snapshots, backups, monitoreo ni otros servicios.

## Despliegue y destrucción

Después de revisar el preview y recibir autorización explícita:

```powershell
pulumi up --stack qa
```

No ejecute `pulumi up` ni `pulumi destroy` sin autorización. `pulumi destroy`
elimina la instancia y el volumen raíz; los datos de aplicación viven en la VM y
deben respaldarse antes de cualquier destrucción.

## Jenkins

El pipeline valida el programa Pulumi con `npm ci` y `npm run typecheck` sin
necesitar credenciales AWS. El preview opcional (`ENABLE_PULUMI_PREVIEW=true`)
requiere Pulumi CLI, una sesión AWS válida y la credencial
`pulumi-config-passphrase`. Consulte [JENKINS-SETUP.md](../../docs/JENKINS-SETUP.md).
