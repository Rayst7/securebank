# Runbook de despliegue

Este runbook es reproducible en Windows PowerShell y en Linux. No ejecute
`pulumi up`, `pulumi destroy` ni `docker compose down -v` sin autorización
explícita.

La infraestructura activa es **AWS + Pulumi/TypeScript** en
[`infrastructure/pulumi`](../infrastructure/pulumi/README.md). El módulo
`infrastructure/terraform` se conserva como legado de referencia Azure.

## 0. Prerrequisitos

- Docker Desktop/Engine con Compose v2.
- Node.js 22 y npm 10+.
- Pulumi CLI 3.27x (validado con 3.274.0).
- AWS CLI v2 con el perfil `default` autenticado mediante `aws login`.
- Cliente OpenSSH (`ssh`, `ssh-keygen`).
- Ansible 2.17+ en Linux/WSL o en un contenedor (el control node Windows nativo
  no es soportado oficialmente).

No se requieren usuarios IAM, IAM Identity Center ni claves de acceso
permanentes. La cuenta es temporal para este proyecto académico.

## 1. Validación local

```powershell
docker compose --profile app --profile tools config --quiet
docker compose --profile app up -d --build
docker ps
curl http://127.0.0.1:8080/
curl http://127.0.0.1:8080/api/
node tests/api/smoke.mjs
```

Resultado esperado: cinco contenedores `healthy`, frontend HTTP 200 y API proxy
HTTP 200. No use `docker compose down -v`; los volúmenes contienen datos.

> Si Docker Desktop presenta el error de Bake `read |0: file already closed`,
> ejecute `$env:COMPOSE_BAKE='false'` antes del build. Jenkins y Ansible ya lo
> establecen.

## 2. Autenticación AWS

Verifique la sesión con una llamada real, no solo con `aws configure list`:

```powershell
aws sts get-caller-identity --profile default
aws configure list --profile default
```

Debe devolver la cuenta y el ARN esperados y región `us-east-1`. Si la sesión
expiró, ejecute el login interactivo que indique AWS CLI:

```powershell
aws login --profile default
```

No cree usuarios IAM ni claves de acceso permanentes. No comparta tokens ni
credenciales temporales.

### Puente de credenciales para Pulumi

Pulumi usa la cadena de credenciales del SDK de AWS. Exporte credenciales
temporales en la misma sesión de shell, sin imprimirlas:

```powershell
$creds = aws configure export-credentials --profile default | ConvertFrom-Json
$env:AWS_ACCESS_KEY_ID = $creds.AccessKeyId
$env:AWS_SECRET_ACCESS_KEY = $creds.SecretAccessKey
$env:AWS_SESSION_TOKEN = $creds.SessionToken
$env:AWS_REGION = "us-east-1"
```

No guarde estas variables en archivos. En un agente CI use una sesión
`aws login` o el instance profile del agente.

## 3. Clave SSH

Existe una clave dedicada en `~/.ssh/securebank_qa` (la privada nunca se
publica). Para crearla en otra estación:

```powershell
ssh-keygen -t ed25519 -C "securebank-qa" -f "$HOME/.ssh/securebank_qa"
Get-Content "$HOME/.ssh/securebank_qa.pub"
```

En Linux/macOS:

```bash
ssh-keygen -t ed25519 -C "securebank-qa" -f ~/.ssh/securebank_qa
cat ~/.ssh/securebank_qa.pub
```

Copie **solo la clave pública** a la configuración de Pulumi. AWS crea el
usuario `ubuntu` y Ansible se conecta con ese usuario. Nunca copie la privada al
repositorio ni a Jenkins como texto plano; Jenkins usa la credencial
`securebank-qa-ssh`.

## 4. Configuración Pulumi

El backend local exige una passphrase. Genérela una vez y guárdela fuera del
repositorio:

```powershell
$passFile = Join-Path $HOME ".pulumi\securebank-passphrase"
$env:PULUMI_CONFIG_PASSPHRASE_FILE = $passFile
```

En cada sesión nueva exporte `PULUMI_CONFIG_PASSPHRASE_FILE` con la misma ruta.
Para trabajo compartido use un backend S3 con bloqueo; el backend local no es
apto para concurrencia.

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
pulumi config set allowedSshCidr "<IP_PUBLICA_ADMIN>/32"
pulumi config set sshPublicKey (Get-Content "$HOME\.ssh\securebank_qa.pub" -Raw).Trim()
```

`Pulumi.qa.yaml` está ignorado por Git; use `Pulumi.qa.yaml.example` como
referencia. No use `0.0.0.0/0` para SSH. `t3.medium` es el mínimo; `t3.large`
evita presión de memoria si se compilan imágenes dentro de la VM.

Valide y revise el preview:

```powershell
npm run typecheck
pulumi preview --stack qa --non-interactive --diff
```

Resultado verificado el 2026-11-05: **12 recursos a crear** (11 recursos AWS y el
recurso de stack de Pulumi). Revise el preview y solicite autorización antes de:

```powershell
pulumi up --stack qa
```

No se ha ejecutado `pulumi up` en esta estación.

## 5. Aprovisionamiento y Ansible

Después de autorizar `pulumi up`, obtenga las salidas:

```powershell
pulumi stack output applicationUrl
pulumi stack output publicIpAddress
pulumi stack output sshCommand
pulumi stack output ansibleInventoryHint
```

Prepare Ansible en la estación de control:

```bash
cd ansible
cp inventory/hosts.example.yml inventory/hosts.yml
cp inventory/group_vars/all.example.yml inventory/group_vars/all.yml
# edite ansible_host con la IP pública; ansible_user debe ser ubuntu
ansible-vault encrypt inventory/group_vars/all.yml
```

`group_vars` vive junto al inventario porque Ansible lo carga desde el
directorio del inventario o del playbook. La ubicación anterior
(`ansible/group_vars/`) no era leída con los playbooks en `playbooks/`.

Si no tiene Ansible instalado, puede usar un contenedor Linux:

```bash
docker run --rm -it \
  -v "$PWD:/work" -w /work \
  -e ANSIBLE_ROLES_PATH=/work/roles \
  python:3.12-slim \
  sh -c "pip install 'ansible-core>=2.17,<2.19' && ansible-playbook -i inventory/hosts.yml playbooks/bootstrap.yml"
```

En Jenkins, el pipeline genera el inventario desde `QA_SSH_HOST`/`QA_SSH_USER`
(`ubuntu` por defecto) y usa `securebank-qa-ssh`, `ansible-vault-password` y
`securebank-qa-vars`.

Secuencia manual:

```bash
ansible-playbook -i inventory/hosts.yml playbooks/bootstrap.yml --ask-vault-pass
ansible-playbook -i inventory/hosts.yml playbooks/deploy.yml --ask-vault-pass
```

`bootstrap.yml` instala Docker, Compose, rsync y rotación de logs.
`deploy.yml` crea el `.env` en `/opt/securebank/app`, valida Compose, construye
la imagen de migraciones, ejecuta Prisma y levanta el stack. Al final verifica
HTTP 200 en `/` y `/api/`.

## 6. Verificación posterior

```bash
curl -I http://<IP_PUBLICA>/
curl http://<IP_PUBLICA>/api/
ssh ubuntu@<IP_PUBLICA>
cd /opt/securebank/app
docker compose --profile app ps
docker compose --profile app logs --tail=100 backend
```

No detenga contenedores ajenos al proyecto. No borre volúmenes.

## 7. Jenkins

Consulte [JENKINS-SETUP.md](JENKINS-SETUP.md). El pipeline tiene aprobación
manual para QA y para el despliegue final. Si SonarQube está habilitado, un
Quality Gate rechazado aborta el pipeline y bloquea el despliegue final.

La etapa `Pulumi Validate` instala dependencias y ejecuta `npm run typecheck` sin
credenciales AWS. `Pulumi Preview` es opcional (`ENABLE_PULUMI_PREVIEW=true`) y
requiere una sesión AWS válida, backend/stack Pulumi y la credencial
`pulumi-config-passphrase`. Nunca ejecuta `pulumi up`.

## 8. Rollback

1. No ejecute `docker compose down -v`.
2. Guarde el release anterior en `/opt/securebank/releases/<fecha>` antes de
   actualizar.
3. Vuelva a sincronizar el release anterior y ejecute
   `docker compose --profile app up -d --build`.
4. Verifique `/` y `/api/`.
5. Para infraestructura, `pulumi destroy` requiere autorización explícita y una
   revisión previa. Elimina la instancia y el volumen raíz: respalde los datos de
   la VM antes de cualquier destrucción.

## 9. Problemas conocidos

| Síntoma | Causa | Acción |
|---|---|---|
| `aws sts get-caller-identity` falla o expiró | Sesión `aws login` vencida | Ejecutar `aws login --profile default`; `aws configure list` por sí solo no renueva la sesión |
| Pulumi no encuentra credenciales AWS | La sesión de `aws login` no llega al SDK | Exportar credenciales temporales con `aws configure export-credentials` en la misma shell |
| `passphrase must be set` | Falta la passphrase del backend local | Exportar `PULUMI_CONFIG_PASSPHRASE_FILE` con la ruta del archivo |
| Frontend no responde desde Internet | Compose publicaba `127.0.0.1` | Ansible define `FRONTEND_BIND_ADDRESS=0.0.0.0`, `FRONTEND_PORT=80` |
| `/api` redirige a puerto 80 | Nginx usaba `$host` y redirección absoluta | `absolute_redirect off` y `$http_host` |
| `ansible-playbook` no encuentra roles | `ansible.cfg` ignorado en volumen world-writable | Exportar `ANSIBLE_ROLES_PATH=/work/roles` |
| SSH pide usuario incorrecto | Se usó el usuario anterior de Azure | En AWS el usuario es `ubuntu` |
| `npm audit` devuelve 7 high | Dependencias del backend | Revisar y actualizar en una tarea separada; no ejecutar `audit fix` sin pruebas |
| Cypress/Maestro/ZAP/k6 no corren | Herramientas/emulador no instalados | Habilitar parámetros solo cuando estén disponibles |
| El preview muestra 12 recursos | 11 recursos AWS + marcador de stack Pulumi | Es el resultado esperado; no se ha creado nada |
