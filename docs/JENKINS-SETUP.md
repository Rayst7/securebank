# Configuración de Jenkins

El `Jenkinsfile` usa un agente Linux con etiqueta `linux-docker`. No se ha
ejecutado en un Jenkins real en esta estación; las etapas que dependen de
herramientas externas están desactivadas por defecto y fallan de forma explícita
si se habilitan sin instalarlas.

## Agente

Instale en el agente `linux-docker`:

- Git, Docker Engine y Docker Compose v2.
- Node.js 22 y npm 10+.
- Pulumi CLI 3.27x (validado con 3.274.0).
- AWS CLI v2 con una sesión válida (`aws login` o instance profile del agente).
  No se requieren usuarios IAM ni claves de acceso permanentes.
- Ansible 2.17+ y `rsync`. El pipeline invoca `ansible-playbook`
  directamente; el contenedor del runbook es solo para ejecución manual.
- Acceso al backend de Pulumi configurado para el agente. Para CI use un backend
  S3 compartido (`pulumi login s3://<bucket>`) y el stack `qa` inicializado; el
  backend local solo sirve para una estación de trabajo.
- `sonar-scanner` si se habilita SonarQube.
- `sourceanalyzer` de Fortify si se habilita Fortify.
- Maestro y un emulador/dispositivo si se habilita Maestro.
- Acceso al socket de Docker para construir imágenes y ejecutar ZAP/k6.

## Plugins recomendados

- Pipeline / Pipeline: Declarative.
- Git.
- Credentials Binding.
- SSH Agent.
- SonarQube Scanner.
- OWASP Dependency-Check.
- Fortify (si se dispone de licencia).
- HTML Publisher (opcional, para reportes).
- JUnit (opcional, cuando se agregue `jest-junit`).

## Credenciales

| ID | Tipo | Uso |
|---|---|---|
| `securebank-qa-ssh` | SSH private key | Acceso Ansible/SSH a la VM QA |
| `securebank-final-ssh` | SSH private key | Acceso Ansible/SSH al entorno final |
| `ansible-vault-password` | Secret file | Contraseña del vault QA |
| `ansible-vault-password-final` | Secret file | Contraseña del vault final |
| `securebank-qa-vars` | Secret file | `inventory/group_vars/all.yml` cifrado con el vault QA |
| `securebank-final-vars` | Secret file | `inventory/group_vars/all.yml` cifrado con el vault final |
| `pulumi-config-passphrase` | Secret file | Passphrase del backend/proveedor de secretos de Pulumi para `pulumi preview` |
| `nvd-api-key` | Secret text | OWASP Dependency-Check |

El agente debe tener una sesión AWS válida para `pulumi preview`; el pipeline la
exporta con `aws configure export-credentials` en memoria y no imprime los
valores. No cree claves de acceso permanentes ni usuarios IAM para Jenkins.

`securebank-qa-vars` y `securebank-final-vars` contienen el archivo de variables
cifrado con `ansible-vault`. El pipeline lo copia temporalmente a
`ansible/inventory/group_vars/all.yml`, ejecuta Ansible y lo elimina al terminar.
No guarde ese archivo en el repositorio ni lo pase como texto plano.

Para preparar la credencial QA:

```bash
cd ansible
cp inventory/group_vars/all.example.yml inventory/group_vars/all.yml
# complete las credenciales y luego:
ansible-vault encrypt inventory/group_vars/all.yml
```

Suba el archivo cifrado como *Secret file* con ID `securebank-qa-vars` y la
contraseña del vault como *Secret file* con ID `ansible-vault-password`. Repita
el proceso con `securebank-final-vars` y `ansible-vault-password-final`.

Configure como variables globales o de job:

- `QA_SSH_HOST`, `QA_SSH_USER` (también son parámetros del pipeline; en AWS el
  usuario Ubuntu por defecto es `ubuntu`).
- `FINAL_SSH_HOST`, `FINAL_SSH_USER` (usuario `ubuntu` en AWS).
- `QA_BASE_URL`, `FINAL_BASE_URL`.
- `SONAR_HOST_URL` y servidor Sonar llamado `sonar` en *Manage Jenkins → System*.

No suba claves privadas, `.env`, `Pulumi.qa.yaml`, la passphrase de Pulumi ni
contraseñas al repositorio. El estado local de Pulumi y los archivos
`Pulumi.*.yaml` están ignorados por Git.

## Parámetros del pipeline

| Parámetro | Default | Efecto |
|---|---|---|
| `DEPLOY_QA` | `false` | Habilita aprobación, sincronización, Ansible y pruebas dinámicas QA |
| `DEPLOY_FINAL` | `false` | Habilita aprobación y despliegue final |
| `ENABLE_SONAR` | `false` | Análisis y Quality Gate |
| `ENABLE_DEPENDENCY_CHECK` | `false` | OWASP Dependency-Check |
| `ENABLE_FORTIFY` | `false` | Fortify SCA |
| `ENABLE_CYPRESS` | `false` | Cypress contra `QA_BASE_URL` |
| `ENABLE_MAESTRO` | `false` | Maestro contra emulador/dispositivo |
| `ENABLE_DAST` | `false` | ZAP baseline contra `QA_BASE_URL` |
| `ENABLE_PERFORMANCE` | `false` | k6 contra `QA_BASE_URL` |
| `ENABLE_PULUMI_PREVIEW` | `false` | `pulumi preview` de AWS; requiere sesión AWS y backend Pulumi. Nunca ejecuta `pulumi up` |

## Flujo recomendado

1. Ejecutar el pipeline sin parámetros: checkout, validación y typecheck de
   Pulumi, dependencias, lint, pruebas, npm audit y build Docker.
2. Configurar credenciales y agente.
3. Ejecutar con `DEPLOY_QA=true`; aprobar el input.
4. Revisar API tests y, si están disponibles, Cypress/ZAP/k6.
5. Habilitar `ENABLE_SONAR=true`; un Quality Gate rechazado aborta el pipeline.
6. Solo con Quality Gate aprobado y pruebas críticas en verde, ejecutar
   `DEPLOY_FINAL=true` y aprobar el segundo input.

## Limitaciones actuales

- Fortify es propietario: no se puede ejecutar sin licencia y configuración.
- SonarQube, Dependency-Check, ZAP y k6 requieren servicios/imágenes externas.
- Maestro requiere emulador Android o dispositivo físico.
- El frontend no tiene pruebas unitarias propias; el pipeline ejecuta typecheck y
  `npm run test --if-present`.
- `npm audit` bloquea solo vulnerabilidades críticas; las 7 altas y 2 moderadas
  del backend quedan documentadas para corrección revisada.
- `Pulumi Validate` instala dependencias y ejecuta `npm run typecheck` sin
  credenciales AWS. `Pulumi Preview` es opcional, requiere una sesión AWS válida,
  backend/stack Pulumi y la credencial `pulumi-config-passphrase`; nunca ejecuta
  `pulumi up`. El update requiere revisión y aprobación explícita.
