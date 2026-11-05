# AWS + Pulumi - 2026-11-05

## Alcance

Migración de la infraestructura activa de Terraform/Azure a Pulumi/TypeScript
sobre AWS, conservando Docker, Ansible y Jenkins. No se ejecutó `pulumi up` ni
`pulumi destroy`; no se creó ningún recurso AWS.

## Identidad y estado inicial

```text
aws sts get-caller-identity --profile default
  Account: 163649295962
  Arn:     arn:aws:iam::163649295962:root
  Region:  us-east-1
  Credential type: login
```

Inventario previo (solo lectura):

- Sin instancias EC2.
- Sin key pairs.
- Sin security groups no default.
- Sin Elastic IPs.
- Solo la VPC default `vpc-027d5c2c8b25f15ab` (`172.31.0.0/16`).

No se crearon usuarios IAM, recursos de IAM Identity Center ni claves de acceso
permanentes.

## Proyecto Pulumi

Directorio: `infrastructure/pulumi`.

```text
Pulumi CLI        v3.274.0
Node.js           v22.20.0
npm               10.9.3
@aws/aws          7.53.0
@pulumi/pulumi    3.274.0
Backend           local (file://~)
Stack             qa
```

Configuración no secreta cargada en el stack: región `us-east-1`,
`projectName=securebank`, `environment=qa`, VPC `10.20.0.0/16`, subred
`10.20.10.0/24`, `instanceType=t3.medium`, CIDR SSH administrativo /32 y la clave
pública `~/.ssh/securebank_qa.pub`. La clave privada y la passphrase nunca se
imprimieron ni se versionaron.

## Validaciones

| Comando | Resultado |
|---|---|
| `npm install` | 223 paquetes instalados, exit 0 |
| `npm run typecheck` | exit 0, sin errores |
| `pulumi preview --stack qa --non-interactive --diff` | exit 0, `Resources: + 12 to create` |
| `pulumi preview --json` | `create=12`, `update=0`, `delete=0` |
| Recursos AWS realmente creados | ninguno |

## Recursos que se crearían

1. `aws:ec2/vpc:Vpc` `10.20.0.0/16`.
2. `aws:ec2/internetGateway:InternetGateway`.
3. `aws:ec2/subnet:Subnet` pública `10.20.10.0/24`.
4. `aws:ec2/routeTable:RouteTable`.
5. `aws:ec2/route:Route` `0.0.0.0/0` al Internet Gateway.
6. `aws:ec2/routeTableAssociation:RouteTableAssociation`.
7. `aws:ec2/securityGroup:SecurityGroup` con `443`, `80` solo QA y `22` solo
   desde el CIDR administrativo.
8. `aws:ec2/keyPair:KeyPair` con la clave pública existente.
9. `aws:ec2/instance:Instance` Ubuntu 24.04 `t3.medium`, 30 GB gp3 cifrado,
   IMDSv2.
10. `aws:ec2/eip:Eip`.
11. `aws:ec2/eipAssociation:EipAssociation`.
12. `pulumi:pulumi:Stack` (marcador de estado; no es un recurso AWS).

## Costos estimados (`us-east-1`)

Precios públicos consultados el 2026-11-05, sin impuestos, créditos ni
transferencia de datos:

| Recurso | Precio | Estimado mensual |
|---|---|---|
| `t3.medium` Linux | USD 0.0416/hora | ~USD 30.37 |
| EBS gp3 30 GB | USD 0.08/GB-mes | ~USD 2.40 |
| IPv4 pública / Elastic IP | USD 0.005/hora | ~USD 3.65 |
| **Total** | | **~USD 36.42/mes** |

`t3.large`: cómputo ~USD 60.74/mes, total aproximado ~USD 66.79/mes.

## Cambios de soporte

- Ansible: usuario SSH por defecto `ubuntu` para AWS; playbooks y roles sin
  cambios de lógica.
- Jenkins: etapa `Pulumi Validate` (`npm ci` + typecheck) y `Pulumi Preview`
  opcional con `ENABLE_PULUMI_PREVIEW`. No se agregó ningún paso de `pulumi up`.
- Documentación activa actualizada a AWS/Pulumi. Terraform/Azure marcado como
  legado.

## Limitaciones

- El backend Pulumi es local; no es apto para trabajo concurrente. Para Jenkins
  se requiere un backend S3 compartido y el stack inicializado.
- No se ejecutó `pulumi up`, por lo que no existe instancia para validar Ansible
  `--check` ni el despliegue real.
- El pipeline Jenkins no se ejecutó: no hay Jenkins ni agente `linux-docker` en
  esta estación.
- Las credenciales de `aws login` son temporales; el preview debe repetirse si
  expiran.
- No se incluyen claves privadas, tokens, contraseñas ni valores de `.env`.
