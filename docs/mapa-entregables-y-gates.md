# Mapa de entregables QA y dependencia del pipeline

**Estado:** planificación. No se han ejecutado las pruebas contra un entorno real.

| Stage Jenkins | Herramienta | Artefacto esperado | Dueño de ejecución | ¿Existe automatización en este kit? |
|---|---|---|---|---|
| 1 Checkout | Git | SHA de commit | DevOps | No (integración de equipo) |
| 2 Dependencias | npm ci | Log | DevOps | Guía |
| 3 Lint | oxlint | Log y estado | Backend/Web/DevOps | Guía |
| 4 Unitarias | Jest | Cobertura y test log | QA + Backend | Sí, runner de pruebas existentes |
| 5 SonarQube | Scanner | Quality Gate + dashboard | DevOps + QA | Guía (requiere servidor/token) |
| 6 npm audit | npm | Audit JSON | QA | Sí, runner |
| 7 Dependency-Check | OWASP | HTML/JSON | DevSecOps + QA | Guía (requiere herramienta/feed) |
| 8 Fortify | OpenText Fortify | FPR/report | DevSecOps + QA | Guía (requiere licencia/acceso) |
| 9 Docker Build | Docker | Identificador de imagen | DevOps | Bloqueado sin Dockerfiles |
| 10 Deploy QA | Docker/Ansible/IaC | URL+health | DevOps | Bloqueado sin IaC/Ansible |
| 11 API | Insomnia/Node | JSON/log, casos | QA | Sí, coleccion/Node |
| 12 Cypress | Cypress | Capturas, video, console | QA | Sí, 5 flujos |
| 13 Maestro | Maestro | JUnit/video | QA+Móvil | Bloqueado hasta APK |
| 14 ZAP | OWASP ZAP | HTML/JSON | QA+DevSecOps | Guía (QA aislado) |
| 15 Performance | k6 | JSON, p95, throughput | QA | Sí, GET y transferencias separadas |
| 16 Quality Gate | Jenkins/Sonar | PASS/FAIL documentado | QA+DevOps | Por integrar |
| 17 Aprobación | Jenkins | Identidad y registro | DevOps/Responsable | Por integrar |
| 18 Deploy final | Jenkins+IaC | Release, URL, evidencias | DevOps | Bloqueado mientras haya P0 |

## Reglas de liberación

- Si una etapa de pruebas P0, Quality Gate o SAST/DAST crítico incumple criterios: estado NO-GO.
- Un `SKIPPED` o `BLOQUEADO` nunca debe contarse como `PASS`.
- No convertir errores de scanner a `returnStatus` ignorado, `|| true` o pasos que continúan.
- La captura de reportes deberá ejecutarse aunque una suite falle (`post { always { ... } }`).
- En Jenkins usar **Credentials** para tokens/passwords, nunca insertar valores en Jenkinsfile.
- Antes de compartir artefactos revisar si contienen JWT, contraseñas, variables o información bancaria.

## Enlaces de documentación técnica

- Insomnia CLI: https://developer.konghq.com/inso-cli/reference/run_collection/
- Cypress: https://docs.cypress.io/app/guides/screenshots-and-videos
- Maestro: https://docs.maestro.dev/maestro-flows/workspace-management/test-reports-and-artifacts
- k6: https://grafana.com/docs/k6/latest/using-k6/thresholds/
- ZAP: https://www.zaproxy.org/docs/docker/
