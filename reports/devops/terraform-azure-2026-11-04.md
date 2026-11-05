# Terraform y Azure - 2026-11-04

## Comandos validados

```text
terraform fmt -recursive        -> correcto
terraform init -input=false     -> correcto, azurerm 4.81.0
terraform validate              -> Success! The configuration is valid.
terraform plan -input=false     -> FALLÓ por autenticación
```

## Bloqueo de autenticación

`az account show` devuelve la suscripción `Azure for Students` en estado
`Enabled`, pero el token de management está revocado:

```text
AADSTS50173: The provided grant has expired due to it being revoked,
a fresh auth token is needed.
Status: Response_Status.Status_InteractionRequired
```

La acción requerida es un `az login` interactivo del responsable de la cuenta.
No se ejecutó `az login` desde el agente.

## Configuración preparada localmente

- `infrastructure/terraform/terraform.tfvars` existe y está ignorado por Git.
- Incluye una clave **pública** SSH dedicada y `allowed_ssh_cidr` con la IP
  administrativa actual /32.
- La clave privada está en `~/.ssh/securebank_qa` y no se ha mostrado ni
  copiado al repositorio.
- `cloud-init` ya no redeclara el usuario administrador; Azure instala la clave
  pública mediante `admin_ssh_key`.
- SSH queda cerrado si `allowed_ssh_cidr` es `null`; se rechaza `0.0.0.0/0`.

## Costo estimado

Precios públicos de Azure Retail para `eastus`, sin impuestos ni descuentos:

| Recurso | Estimado mensual |
|---|---|
| VM Standard_B2s Linux | ~USD 30.37 |
| IP pública Standard estática | ~USD 3.65 |
| Disco SSD Standard 30 GB | ~USD 2.40 |
| **Total** | **~USD 36.42** |

`Standard_B2ms` (8 GB) es recomendable si se compilan imágenes dentro de la VM.

## Estado

No se creó ningún recurso Azure. No se ejecutó `terraform apply` ni
`terraform destroy`.
