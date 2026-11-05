# Terraform para Azure (legado)

> **Legado / referencia.** La infraestructura activa es **AWS + Pulumi** en
> [`infrastructure/pulumi`](../pulumi/README.md). Este módulo Azure se conserva
> para trazabilidad y no debe desplegarse sin una decisión explícita.

Este módulo prepara un entorno **QA** de bajo alcance: grupo de recursos, VNet,
subnet, NSG, IP pública estática, NIC y una VM Ubuntu para ejecutar Docker
Compose mediante Ansible. El backend sigue siendo un monolito modular; no se
crean servicios administrados ni microservicios.

## Recursos

- `azurerm_resource_group` `rg-securebank-qa`.
- `azurerm_virtual_network` `10.20.0.0/16`.
- `azurerm_subnet` `10.20.10.0/24`.
- `azurerm_network_security_group`: HTTPS 443, SSH 22 solo desde
  `allowed_ssh_cidr` (se recomienda /32) y HTTP 80 solo en QA.
- `azurerm_public_ip` Standard estática.
- `azurerm_network_interface` + asociación al NSG.
- `azurerm_linux_virtual_machine` Ubuntu 24.04, `Standard_B2s`, disco SSD de
  30 GB, autenticación solo por clave SSH.
- `cloud-init` instala `python3`, `python3-apt` y deshabilita password SSH.

## Validación local

```bash
cd infrastructure/terraform
terraform init
terraform fmt -check
terraform validate
terraform plan -out=tfplan
terraform show -no-color tfplan
```

Estado verificado el 2026-11-04:

- `terraform fmt` y `terraform fmt -check`: correctos.
- `terraform init`: correcto (azurerm 4.81.0).
- `terraform validate`: `Success! The configuration is valid.`
- `terraform plan`: **bloqueado** por token Azure revocado
  (`AADSTS50173`). Requiere `az login` interactivo.

## Autenticación

```bash
az login --tenant "<TENANT_ID>"
az account show --query "{name:name, tenantId:tenantId, state:state}" -o table
az provider show -n Microsoft.Compute --query registrationState -o tsv
```

No basta con que `az account show` muestre la cuenta: el token de management
debe ser válido.

## Variables

Copie `terraform.tfvars.example` a `terraform.tfvars` (ignorado por Git) y
complete:

```hcl
location         = "eastus"
environment      = "qa"
admin_username   = "securebankadmin"
vm_size          = "Standard_B2s"
allowed_ssh_cidr = "<IP_ADMIN>/32"
ssh_public_key   = "ssh-ed25519 AAAA... securebank-qa"
```

Nunca coloque la clave privada en Terraform. El módulo valida que
`allowed_ssh_cidr` no sea `0.0.0.0/0` y que la clave sea OpenSSH válida.

## Salidas

- `resource_group_name`
- `public_ip_address`
- `application_url`
- `ssh_command`
- `vm_size`
- `ansible_inventory_hint`

## Costos estimados

Precios de la API pública de Azure Retail para `eastus` consultados el
2026-11-04, sin impuestos, descuentos ni créditos:

| Recurso | Precio | Estimado mensual |
|---|---|---|
| VM `Standard_B2s` Linux | USD 0.0416/hora | ~USD 30.37 |
| IP pública Standard estática | USD 0.005/hora | ~USD 3.65 |
| Disco SSD Standard 30 GB (E4 LRS) | USD 2.40/mes | ~USD 2.40 |
| **Total aproximado** | | **~USD 36.42/mes** |

No incluye egreso de red, backups ni otros servicios. `Standard_B2s` (2 vCPU,
4 GB) es el mínimo; para compilar imágenes dentro de la VM y evitar presión de
memoria se recomienda `Standard_B2ms` (8 GB), aproximadamente el doble de costo
de cómputo.

## Estado remoto y producción

Antes de un entorno compartido configure un backend remoto de Azure Storage con
bloqueo de estado. Para producción agregue TLS, Key Vault, backups de PostgreSQL,
monitoreo y sustituya los servicios de datos locales por servicios administrados
o un plan operativo equivalente.

## Destrucción

`terraform destroy` no se ejecuta sin autorización explícita y sin revisar el
plan de destrucción.
