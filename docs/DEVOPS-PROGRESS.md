# Registro de avance DevOps

## 2026-11-05

### Migración de la infraestructura activa a AWS + Pulumi

- Nueva infraestructura activa en `infrastructure/pulumi` con Pulumi/TypeScript.
- `infrastructure/terraform` se conserva como **legado/referencia Azure**; no se
  eliminó ni se reescribió.
- Backend local de Pulumi con passphrase fuera del repositorio; `Pulumi.*.yaml`
  y `infrastructure/pulumi/bin/` están ignorados por Git.
- Recursos definidos con paridad respecto al diseño anterior:
  - VPC `10.20.0.0/16` y subred pública `10.20.10.0/24`.
  - Internet Gateway, tabla de rutas y ruta `0.0.0.0/0`.
  - Security group: `443` público; `80` solo en QA; `22` solo desde
    `allowedSshCidr` (sin `0.0.0.0/0`).
  - Key pair EC2 con la clave pública `~/.ssh/securebank_qa.pub`.
  - Instancia Ubuntu 24.04 `t3.medium`, volumen raíz gp3 de 30 GB cifrado e
    IMDSv2 obligatorio.
  - Elastic IP + asociación a la instancia.
  - `cloud-init` con `python3`, `python3-apt`, `ca-certificates` y SSH sin
    contraseña.
- Ansible se actualizó para el usuario por defecto de AWS: `ubuntu` (antes
  `securebankadmin`). Se conservaron playbooks, roles, vault y healthchecks.
- Jenkins: `Terraform Validate` se reemplazó por `Pulumi Validate`
  (`npm ci` + `npm run typecheck`, sin credenciales AWS). Se agregó
  `Pulumi Preview` opcional (`ENABLE_PULUMI_PREVIEW=true`) que requiere sesión
  AWS, backend/stack Pulumi y `pulumi-config-passphrase`; nunca ejecuta
  `pulumi up`.
- Documentación activa actualizada a AWS/Pulumi: arquitectura, runbook, Jenkins,
  README de Pulumi y README de Ansible. Terraform/Azure quedó marcado como legado.

### Validaciones ejecutadas

| Validación | Resultado real |
|---|---|
| `aws sts get-caller-identity --profile default` | cuenta `163649295962`, ARN `arn:aws:iam::163649295962:root`, región `us-east-1`, credencial `login` |
| Inventario AWS previo | sin instancias EC2, key pairs, security groups no default ni Elastic IPs; solo la VPC default `vpc-027d5c2c8b25f15ab` |
| Pulumi CLI | v3.274.0 |
| `npm install` / `npm run typecheck` | correctos |
| `pulumi preview --stack qa --non-interactive --diff` | correcto: `12 to create` (11 recursos AWS + recurso de stack Pulumi), exit 0 |
| `pulumi preview --json` | `create=12`, `update=0`, `delete=0` |
| Recursos AWS creados | **ninguno**: no se ejecutó `pulumi up` ni `pulumi destroy` |
| Ansible `--syntax-check` | no re-ejecutado en esta sesión; solo cambió el usuario/IP y la documentación |
| Jenkinsfile | no ejecutado: no hay Jenkins ni agente `linux-docker` en esta estación |

### Costos estimados (`us-east-1`)

Precios públicos consultados el 2026-11-05, sin impuestos, créditos ni
transferencia de datos:

| Recurso | Estimado mensual |
|---|---|
| `t3.medium` Linux (2 vCPU, 4 GB) | ~USD 30.37 |
| EBS gp3 30 GB | ~USD 2.40 |
| IPv4 pública / Elastic IP | ~USD 3.65 |
| **Total aproximado** | **~USD 36.42/mes** |

`t3.large` (2 vCPU, 8 GB) es recomendable si se compilan imágenes en la VM:
cómputo ~USD 60.74/mes y total aproximado ~USD 66.79/mes.

### Pendiente y bloqueado por autorización

- Revisar el preview y autorizar explícitamente `pulumi up`.
- Ejecutar Ansible real contra la instancia cuando exista.
- Configurar backend Pulumi compartido (S3 con bloqueo) para Jenkins.
- Instalar Pulumi/AWS CLI y configurar credenciales/agente de Jenkins.
- TLS/HTTPS para QA y producción.
- Actualizar `allowedSshCidr` si cambia la IP pública del administrador.
- Respaldar los datos de la VM antes de cualquier `pulumi destroy`.

## 2026-11-04

### Trabajo previo conservado

- Compose canónico con PostgreSQL, Redis y RabbitMQ, variables obligatorias y
  volúmenes persistentes; `compose.yaml` renombrado a `compose.legacy.yml`.
- Dockerfiles multi-stage para NestJS y React/Nginx.
- Perfil `app`, job `migrate` y proxy Nginx `/api`.
- Backend: 36 pruebas aprobadas, build correcto.
- Frontend: typecheck, lint y build correctos.
- Terraform, Ansible, Jenkins y documentación inicial creados previamente.
- No se restauró ni sobrescribió trabajo existente; no se hizo commit ni push.

### Completado y validado en esta continuación

- Compose: los puertos de frontend/backend ahora son configurables. Local sigue
  en `127.0.0.1`; QA publica Nginx en `0.0.0.0:80` mediante Ansible.
- Nginx: corregida la redirección `/api` → `/api/` para conservar el puerto
  publicado (`absolute_redirect off`, `$http_host`, `X-Forwarded-Port`).
- Imagen de frontend reconstruida y contenedor recreado; stack completo sano.
- Ansible: defaults de binding, creación de directorios, validación de Compose,
  healthchecks HTTP y `/api`, rotación de logs Docker, rsync.
- Terraform: validaciones de variables, SSH solo por CIDR, HTTP solo en QA,
  disco explícito de 30 GB, cloud-init sin redeclarar usuario, outputs nuevos.
- Terraform: `fmt`, `init` y `validate` correctos. `plan` bloqueado por token
  Azure revocado.
- Jenkins: pipeline ampliado con Checkout, Terraform Validate, dependencias,
  lint, unit tests, SonarQube, npm audit, Dependency-Check, Fortify,
  Docker Build, Deploy QA, API tests, Cypress, Maestro, ZAP, performance,
  Quality Gate, Approval y Deploy final, con aprobaciones y dependencias de
  Quality Gate.
- Jenkins: `Docker Build` exporta placeholders de compilación para las variables
  obligatorias de Compose; no se inicia ningún servicio ni se usa un secreto real.
- Jenkins: `Deploy QA`/`Deploy final` materializan las credenciales
  `securebank-qa-vars`/`securebank-final-vars` en
  `ansible/inventory/group_vars/all.yml` y las eliminan con `trap`.
- Ansible: `group_vars` se movió junto al inventario. Se verificó en un
  contenedor limpio que `ansible/group_vars/` no se carga con los playbooks en
  `ansible/playbooks/`, mientras que `ansible/inventory/group_vars/` sí.
- Ansible: defaults no secretos agregados al rol y validación de secretos con
  `default('')` para emitir el mensaje previsto cuando faltan credenciales.
- Pruebas: smoke API, configuración Cypress, flujo Maestro y umbrales k6
  creados y versionables.
- Documentación: arquitectura Azure/web/backend/móvil, runbook, setup Jenkins,
  README de Terraform y Ansible.
- Evidencias en `reports/devops/` (incluye `estado-final-2026-11-04.md`) y
  `reports/security/`.

### Validaciones ejecutadas

| Validación | Resultado real |
|---|---|
| `docker version` | 28.3.2 |
| `docker compose version` | v2.38.2-desktop.1 |
| `docker compose --profile app --profile tools config --quiet` | exit 0 |
| `docker ps` | 5 contenedores `healthy` (frontend, backend, PostgreSQL, Redis, RabbitMQ) |
| `GET http://127.0.0.1:8080/` | 200 |
| `GET http://127.0.0.1:8080/api/` | 200, `Hello World!` |
| `node tests/api/smoke.mjs` | 5/5 checks PASS |
| Backend `npm test -- --runInBand` | 36/36 tests, 4 suites |
| Backend `npm run lint` | exit 0, 2 warnings de imports no usados |
| Backend `npm run build` | exit 0 |
| Frontend `npm run typecheck` | exit 0 |
| Frontend `npm run lint` | exit 0 |
| Frontend `npm run build` | exit 0 |
| `npm audit --omit=dev` backend | 0 críticas, 7 altas, 2 moderadas |
| `npm audit --omit=dev` frontend | 0 vulnerabilidades |
| `terraform fmt -check` / `init` / `validate` | correctos; azurerm 4.81.0 (revalidado) |
| `terraform plan` | bloqueado: `AADSTS50173`, token Azure revocado |
| `az account show` | cuenta `Azure for Students`, estado `Enabled` (token de management inválido) |
| `az provider show -n Microsoft.Compute` | bloqueado con `AADSTS50173` (revalidado) |
| Ansible `--syntax-check` bootstrap/deploy | correcto con ansible-core 2.18.x en contenedor (revalidado) |
| Carga de `group_vars` | `inventory/group_vars` cargado; `group_vars` raíz no (probado en contenedor) |
| `docker compose --profile app --profile tools config --quiet` | exit 0 (revalidado) |
| `GET http://127.0.0.1:8080/` y `/api/` | 200 (revalidado) |
| Jenkinsfile | no ejecutado: no hay Jenkins/agente `linux-docker` en esta estación |

### Bloqueado por intervención humana

- `az login` interactivo: el token está revocado y `az account show` por sí solo
  no lo renueva.
- Revisión y autorización de `terraform plan`/`apply`.
- Creación de la VM para ejecutar Ansible `--check` y el despliegue real.
- Credenciales, plugins y agente Linux de Jenkins.

### Pendiente

- Ejecutar `terraform plan` y revisar los recursos antes de autorizar `apply`.
- Configurar backend remoto de Terraform antes de trabajo compartido.
- TLS/HTTPS para QA y producción; el NSG ya permite 443 pero Nginx solo sirve 80.
- Habilitar y ejecutar SonarQube, Dependency-Check, Fortify, Cypress, Maestro,
  ZAP y k6 cuando las herramientas estén disponibles.
- Cargar datos demo/seed con autorización explícita.
- Corregir de forma revisada las 7 vulnerabilidades altas del backend.
- Consolidar `prisma.config.ts` y `prisma7.config.ts`.
- Rotar la credencial RabbitMQ que estuvo expuesta previamente.

### Riesgos abiertos

- `Standard_B2s` (4 GB) puede quedarse corta al compilar imágenes en la VM;
  `Standard_B2ms` es recomendable si se construye allí.
- El despliegue QA usa HTTP sin TLS; no debe considerarse producción.
- El estado Terraform es local; no apto para trabajo concurrente.
- Las pruebas dinámicas y de seguridad externas no se ejecutaron; no se declaran
  como aprobadas.
