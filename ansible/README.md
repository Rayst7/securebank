# Ansible

Los playbooks preparan una instancia Ubuntu de **AWS (EC2)** creada con
**Pulumi** y despliegan el stack Docker Compose de SecureBank. El backend es un
monolito modular; Ansible no crea microservicios. La infraestructura activa vive
en [`infrastructure/pulumi`](../infrastructure/pulumi/README.md); Terraform/Azure
se conserva como legado.

## Archivos

- `playbooks/bootstrap.yml`: instala Docker Engine, Compose v2, rsync y rotación
  de logs.
- `playbooks/deploy.yml`: valida secretos, crea `/opt/securebank/app/.env`,
  valida Compose, construye la imagen de migraciones, ejecuta Prisma y levanta
  el stack. Verifica HTTP 200 en `/` y `/api/`.
- `roles/securebank/defaults/main.yml`: en QA publica Nginx en `0.0.0.0:80` y
  mantiene el backend en `127.0.0.1:3000`.
- `inventory/hosts.example.yml`: inventario de ejemplo.
- `inventory/group_vars/all.example.yml`: variables no secretas de ejemplo.

Los archivos reales `inventory/hosts.yml` y `inventory/group_vars/all.yml` están
ignorados por Git. `group_vars` debe estar junto al inventario: Ansible lo carga
desde el directorio del inventario o del playbook, no desde la raíz de
`ansible/` cuando los playbooks están en `playbooks/`.

## Preparación

```bash
cd ansible
cp inventory/hosts.example.yml inventory/hosts.yml
cp inventory/group_vars/all.example.yml inventory/group_vars/all.yml
```

Edite `inventory/hosts.yml` con la IP pública y la clave privada:

```yaml
all:
  children:
    securebank:
      hosts:
        securebank-qa:
          ansible_host: <IP_PUBLICA>
          ansible_user: ubuntu
          ansible_ssh_private_key_file: ~/.ssh/securebank_qa
```

Complete las credenciales en `inventory/group_vars/all.yml` y cífrelo:

```bash
ansible-vault encrypt inventory/group_vars/all.yml
```

La clave privada permanece en `~/.ssh/securebank_qa`. Nunca la copie al
repositorio ni la muestre en logs. Pulumi registra solo la clave pública
(`~/.ssh/securebank_qa.pub`) en el key pair de EC2; AWS crea el usuario `ubuntu`
y Ansible debe conectarse con ese usuario.

La IP pública se obtiene de Pulumi después de un `pulumi up` autorizado:

```powershell
cd infrastructure/pulumi
pulumi stack output publicIpAddress
pulumi stack output ansibleInventoryHint
```

## Validación

Con Ansible instalado:

```bash
ansible-playbook -i inventory/hosts.yml --syntax-check playbooks/bootstrap.yml
ansible-playbook -i inventory/hosts.yml --syntax-check playbooks/deploy.yml
```

Sin Ansible local (contenedor):

```bash
docker run --rm -v "$PWD:/work" -w /work \
  -e ANSIBLE_ROLES_PATH=/work/roles python:3.12-slim \
  sh -c "pip install 'ansible-core>=2.17,<2.19' && \
    ansible-playbook -i /work/inventory/hosts.yml --syntax-check /work/playbooks/bootstrap.yml && \
    ansible-playbook -i /work/inventory/hosts.yml --syntax-check /work/playbooks/deploy.yml"
```

El 2026-11-04 ambos playbooks pasaron `--syntax-check` con ansible-core 2.18.x.
No se ejecutó `--check` contra la instancia porque `pulumi up` no está autorizado
y la VM aún no existe. En AWS el usuario de conexión por defecto es `ubuntu`,
no `securebankadmin`.

## Despliegue

```bash
ansible-playbook -i inventory/hosts.yml playbooks/bootstrap.yml --ask-vault-pass
ansible-playbook -i inventory/hosts.yml playbooks/deploy.yml --ask-vault-pass
```

El pipeline de Jenkins sincroniza el release en `/opt/securebank/app`, genera el
inventario y usa las credenciales `securebank-qa-ssh`,
`ansible-vault-password` y `securebank-qa-vars`.

## Notas

- No ejecute `docker compose down -v`; los volúmenes contienen datos.
- El `.env` se crea con modo `0600` y `no_log`.
- Para producción se requiere TLS, backups y un plan de secretos distinto.
