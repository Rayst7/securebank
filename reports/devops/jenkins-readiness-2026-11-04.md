# Preparación de Jenkins - 2026-11-04

## Estado

El `Jenkinsfile` fue ampliado con todas las etapas solicitadas. No se ejecutó en
un Jenkins real porque no hay servidor ni agente `linux-docker` en esta
estación. No se declaran resultados de herramientas no ejecutadas.

## Etapas implementadas

Checkout, Terraform Validate, Dependencies, Lint, Unit tests, SonarQube,
npm audit, OWASP Dependency-Check, Fortify, Docker Build, Deploy QA, API tests,
Cypress, Maestro, ZAP, Performance, Quality Gate, Approval y Deploy final.

## Controles

- `Deploy QA` y `Deploy final` requieren `input` manual.
- `waitForQualityGate abortPipeline: true` bloquea el pipeline si SonarQube
  rechaza el Quality Gate.
- Las pruebas unitarias, API smoke, npm audit crítico y builds fallan el
  pipeline si no pasan.
- Las etapas externas están desactivadas por defecto y fallan explícitamente si
  se habilitan sin la herramienta o credencial correspondiente.

## Correcciones de consistencia

- `Docker Build` exporta placeholders de compilación para las variables que
  Compose exige al interpolar el archivo; no se inicia ningún servicio ni se usa
  una credencial real.
- `Deploy QA` y `Deploy final` toman `securebank-qa-vars`/`securebank-final-vars`
  (archivo cifrado con Ansible Vault), lo copian a
  `ansible/inventory/group_vars/all.yml` y lo eliminan con `trap` al terminar.
- Se movió `group_vars` junto al inventario. Se comprobó en un contenedor que
  `ansible/group_vars/` no se carga cuando los playbooks están en
  `ansible/playbooks/`, mientras que `ansible/inventory/group_vars/` sí.
- Se agregó `Terraform Validate` (`init -backend=false`, `fmt -check`,
  `validate`). No requiere Azure; `plan`/`apply` siguen siendo manuales y
  requieren aprobación.

## Artefactos de prueba agregados

- `tests/api/smoke.mjs` (probado localmente: 5/5).
- `tests/cypress/cypress.config.ts` y `tests/cypress/e2e/smoke.cy.ts`.
- `tests/maestro/login.yaml`.
- `tests/performance/smoke.js` (k6).
- `sonar-project.properties`.
- `ci/fortify-scan.sh`.

## Pendiente para ejecutar

- Agente Linux con Docker, Node.js 22, Terraform, Ansible, `rsync`.
- Servidor SonarQube y `sonar-scanner`.
- Credenciales `securebank-qa-ssh`, `ansible-vault-password`,
  `securebank-qa-vars`, `securebank-final-ssh`, `ansible-vault-password-final`,
  `securebank-final-vars`, `nvd-api-key`.
- Imágenes/herramientas para Dependency-Check, ZAP, k6 y Cypress.
- Emulador/dispositivo y CLI Maestro.
- Licencia Fortify.
