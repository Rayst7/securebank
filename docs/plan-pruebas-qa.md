# Plan de Pruebas QA — SecureBank

**Curso:** 048 Aseguramiento de la Calidad del Software · **Proyecto:** SecureBank
**Versión:** borrador a validar por el equipo · **Fecha:** [FECHA] · **QA:** [NOMBRE]

## 1. Introducción y objetivo
Evaluar de forma reproducible la integridad transaccional, seguridad, funcionalidad, accesibilidad y desempeño del sistema bancario.
## 2. Alcance y fuera de alcance
Backend, frontend, PostgreSQL, Redis, RabbitMQ, app móvil (cuando exista), pipeline, configuración QA.
Fuera de alcance: dinero real, bancos externos, datos de clientes reales y pentesting fuera del QA autorizado.
## 3. Arquitectura de la solución
React/Vite -> NestJS API -> PostgreSQL; Redis y RabbitMQ; app móvil por confirmar; Jenkins y cloud por equipo.
Agregar diagrama versionado y enlace al commit.
## 4. Riesgos y prioridades
Ver `matriz-riesgos-qa.csv`. P0: saldo, idempotencia, IDOR, secrets, Quality Gate y eventos.
## 5. Estrategia de pruebas
Jest (unitarias), Node/Insomnia (API/integración), Cypress (web), Maestro (móvil), ZAP, SonarQube/Fortify/SCA, k6, Lighthouse/axe.
Separar pruebas de lectura del banco de las que alteran saldos; crear cuenta QA dedicada con datos sintéticos.
## 6. Ambientes y datos de prueba
QA aislado: [URL], [version/commit], [OS/Node], [DB nombre], [captura `docker compose ps`].
Dos usuarios/2 cuentas sintéticas y saldos iniciales controlados. Credenciales locales en variables de entorno, nunca en Git.
## 7. Pruebas unitarias
Ejecutar `npm run test:cov` en backend, archivar cobertura HTML/lcov y resultado. Indicar casos corregidos o fallidos.
## 8. Pruebas de integración
API↔PostgreSQL, API↔Redis, API↔RabbitMQ, consumidor↔RabbitMQ. Usar componentes reales para verificar fallos, no solo mocks.
## 9. Pruebas de API
Importar colección Insomnia, ejecutar `inso run collection`, validar positivo/negativo/autorización.
Node API adicional: idempotencia, saldo antes/después y concurrencia simultánea.
## 10. Funcionales y smoke
Cypress: autenticación, dashboard, rutas protegidas, movimientos, beneficiarios, pagos y transferencias.
## 11. Regresión
Repetir las suites tras cada fix/PR y comparar métricas por commit.
## 12. Móviles
Maestro 5-8 flujos, APK/identificador/versión/escenario Android registrado. PENDIENTE si el artefacto no existe.
## 13. Seguridad
Fortify (SAST), npm audit, Dependency-Check (SCA), ZAP (DAST), auth/IDOR, JWT, inyección, XSS, tasa y secretos.
Registrar severidad, decisión de remediación y evidencia. Escanear solo objetivos autorizados.
## 14. Rendimiento
Escenarios propuestos (deben validarse *antes* de ejecutar): load 5-10 VUs, stress 10-25, spike 5-60.
Umbrales iniciales: p95 < 1000ms, fallos HTTP < 1%, checks > 99%.
Medir entorno, CPU/RAM, throughput, latencia y recuperación. La concurrencia de escritura se prueba por separado.
## 15. Usabilidad y accesibilidad
Lighthouse/axe para accesibilidad automatizada; usabilidad con al menos 5 participantes humanos y tareas predefinidas.
No afirmar que Lighthouse sustituye la observación de usuarios.
## 16. Criterios de entrada y salida
Entrada: QA aislado levantado, backend frontend corriendo, cuentas sembradas, versión estable y herramientas instaladas.
Salida / GO: cero P0 abiertos, vulnerabilidades críticas no aceptadas = 0, Quality Gate PASS, suites críticas PASS,
trazabilidad y reportes, umbrales de rendimiento aprobados, aprobación explícita. Si falta dato crítico: NO-GO.
## 17. Gestión de defectos
GitHub Issue con ID, reproducibilidad, esperado, obtenido, severidad, prioridad, commit, evidencia, responsable y retest.
## 18. Métricas y resultados
Tabla a completar: total, passed, failed, skipped/blocked, porcentaje; coverage, p95, throughput, errores, alertas por severidad, defectos abiertos/cerrados.
**No colocar cifras inventadas.** Vincular resultado con logs y evidencia del mismo commit.
## 19. Riesgos residuales
Registrar riesgos no resueltos, aceptación formal, impacto y plan de respuesta.
## 20. Decisión GO / NO-GO
Decisión [PENDIENTE], fecha [PENDIENTE], evidencia [ENLACES], aprobadores [NOMBRES], justificación [TEXTO].
