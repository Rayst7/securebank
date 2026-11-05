# Estado final de preparación DevOps - 2026-11-04

## Alcance

Rama `feature/devops`. El trabajo conserva el backend como monolito modular
NestJS y no introduce microservicios. No se hizo commit, push, `terraform
apply`, `terraform destroy` ni `docker compose down -v`.

## Resumen ejecutivo

| Área | Estado real |
|---|---|
| Stack local Docker | 5 contenedores `healthy`; frontend y proxy `/api` responden 200 |
| Backend | 36/36 pruebas, lint y build correctos |
| Frontend | typecheck, lint y build correctos |
| Docker/Compose | Configuración válida para local y QA; puertos parametrizados |
| Terraform | `fmt`, `init` y `validate` correctos; `plan` bloqueado por Azure |
| Ansible | Sintaxis válida; `group_vars` corregido y verificado en contenedor |
| Jenkins | Pipeline completo preparado; no ejecutado en un Jenkins real |
| Seguridad de dependencias | 0 críticas; 7 altas y 2 moderadas en backend; frontend sin hallazgos |
| Azure | Sin recursos creados; falta `az login` interactivo y autorización de `apply` |

## Evidencia validada en esta revisión

```text
docker ps
  securebank-frontend   Up (healthy)   127.0.0.1:8080->80/tcp
  securebank-backend    Up (healthy)   127.0.0.1:3000->3000/tcp
  securebank-rabbitmq   Up (healthy)   127.0.0.1:5672->5672/tcp, 127.0.0.1:15672->15672/tcp
  securebank-postgres   Up (healthy)   127.0.0.1:5433->5432/tcp
  securebank-redis      Up (healthy)   127.0.0.1:6379->6379/tcp

GET http://127.0.0.1:8080/       -> 200
GET http://127.0.0.1:8080/api/   -> 200, Hello World!

docker compose --profile app --profile tools config --quiet -> exit 0
terraform fmt -check -recursive -> OK
terraform validate              -> Success! The configuration is valid.
node tests/api/smoke.mjs        -> 5/5 PASS
```

Auditoría de dependencias de producción:

```text
backend:  critical=0 high=7 moderate=2 total=9
frontend: critical=0 high=0 moderate=0 total=0
```

Los JSON completos están en `reports/security/`.

## Correcciones de consistencia aplicadas

1. **Ansible `group_vars`**: se movió de `ansible/group_vars/` a
   `ansible/inventory/group_vars/`. Se comprobó en un contenedor limpio que la
   ubicación anterior no se carga cuando los playbooks están en
   `ansible/playbooks/`; la nueva ubicación sí carga las variables.
2. **Credenciales de Ansible en Jenkins**: `Deploy QA` y `Deploy final` ahora
   consumen `securebank-qa-vars` y `securebank-final-vars` (archivo cifrado con
   Ansible Vault), lo copian temporalmente a
   `ansible/inventory/group_vars/all.yml` y lo eliminan con `trap`.
3. **Docker Build en Jenkins**: Compose interpola todo el archivo incluso para
   `build`. La etapa exporta placeholders de compilación para las variables
   obligatorias; no inicia servicios ni usa credenciales reales.
4. **Terraform Validate en Jenkins**: se agregó una etapa con
   `init -backend=false`, `fmt -check` y `validate`, sin credenciales Azure.
   `plan`/`apply` siguen siendo manuales y requieren aprobación.
5. **Defaults de Ansible**: el rol define rutas y usuarios no secretos, y la
   validación de secretos usa `default('')`. Se verificó en contenedor que, sin
   secretos, falla con el mensaje previsto en lugar de un error de variable
   indefinida.

## Bloqueos humanos

### 1. Azure CLI

`az account show` sigue mostrando la suscripción `Azure for Students` en estado
`Enabled`, pero las llamadas de management fallan:

```text
AADSTS50173: The provided grant has expired due to it being revoked,
a fresh auth token is needed.
Status: Response_Status.Status_InteractionRequired
```

Comando interactivo indicado por Azure CLI (no ejecutado por el agente):

```powershell
az login --tenant "5f53b4ce-63d4-4ee8-88d2-22f0b2d4b27a" --scope "https://management.core.windows.net//.default"
```

Verificación posterior:

```powershell
az provider show -n Microsoft.Compute --query registrationState -o tsv
```

### 2. Aprobación de infraestructura

Después del login, el responsable debe revisar:

```powershell
cd infrastructure/terraform
terraform plan -out=tfplan
terraform show -no-color tfplan
```

No se ejecutará `terraform apply tfplan` sin autorización explícita. Costo
estimado con `Standard_B2s`: ~USD 36.42/mes (VM ~30.37, IP ~3.65, SSD 30 GB
~2.40), sin impuestos, egreso ni backups. `Standard_B2ms` (8 GB) cuesta
aproximadamente el doble en cómputo y es recomendable si se compilan imágenes en
la VM.

### 3. Jenkins y herramientas externas

No hay servidor/agente Jenkins `linux-docker` en esta estación. Tampoco están
disponibles SonarQube, Dependency-Check, Fortify, ZAP, k6, Cypress con navegador
ni emulador Maestro. Las etapas correspondientes están desactivadas por defecto
y fallan de forma explícita si se habilitan sin la herramienta. No se declaran
resultados simulados.

## Próximos pasos

1. Ejecutar el `az login` interactivo y confirmar `Microsoft.Compute` con una
   llamada real de management.
2. Ejecutar `terraform plan -out=tfplan`, revisar `terraform show -no-color
   tfplan` y presentar recursos/costo.
3. Con aprobación explícita, ejecutar `terraform apply tfplan` y obtener
   `application_url`, `public_ip_address`, `ssh_command` y
   `ansible_inventory_hint`.
4. Preparar `ansible/inventory/hosts.yml` y
   `ansible/inventory/group_vars/all.yml`, cifrar este último con
   `ansible-vault` y ejecutar `bootstrap.yml`/`deploy.yml`.
5. Verificar `http://<IP>/` y `http://<IP>/api/`, estado de contenedores y logs.
6. Configurar agente, plugins y credenciales de Jenkins; ejecutar el pipeline
   con `DEPLOY_QA=true` y luego habilitar SonarQube y las pruebas dinámicas.
7. Corregir de forma revisada las 7 vulnerabilidades altas del backend y rotar
   la credencial RabbitMQ que estuvo expuesta previamente.
8. Antes de producción: estado remoto Terraform, TLS, Key Vault, backups,
   monitoreo y reemplazo o plan operativo para PostgreSQL/Redis/RabbitMQ.

## Archivos principales

- `docker-compose.yml`, `frontend/nginx.conf`, Dockerfiles.
- `infrastructure/terraform/` (`main.tf`, `variables.tf`, `outputs.tf`,
  `versions.tf`, `cloud-init.yaml.tftpl`).
- `ansible/` (`playbooks/`, `roles/`, `inventory/group_vars/`).
- `Jenkinsfile`, `ci/fortify-scan.sh`, `sonar-project.properties`.
- `tests/api/`, `tests/cypress/`, `tests/maestro/`, `tests/performance/`.
- `docs/DEVOPS.md`, `docs/DEPLOYMENT-RUNBOOK.md`, `docs/JENKINS-SETUP.md`,
  `docs/DEVOPS-PROGRESS.md`.
- `reports/devops/`, `reports/security/`.

## Seguridad y límites

- No se incluyen claves privadas, tokens, contraseñas ni valores de `.env`.
- `.env`, `terraform.tfvars`, `ansible/inventory/hosts.yml` y
  `ansible/inventory/group_vars/all.yml` están ignorados por Git.
- El despliegue QA usa HTTP sin TLS; no debe considerarse producción.
- Las pruebas dinámicas y de seguridad externas no se ejecutaron; no se
  declaran como aprobadas.
