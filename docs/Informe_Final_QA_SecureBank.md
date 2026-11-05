# INFORME FINAL DE ASEGURAMIENTO DE LA CALIDAD DEL SOFTWARE

## SECUREBANK — Plataforma de banca digital simulada

**Universidad:** Universidad Mariano Gálvez de Guatemala  
**Facultad / carrera:** Ingeniería en Sistemas  
**Curso:** 048 · Aseguramiento de la Calidad del Software  
**Proyecto:** SecureBank · Proyecto final integrador de QA / DevSecOps  
**Responsable de QA:** [Completar nombre y carné antes de la entrega]  
**Equipo de desarrollo:** [Completar integrantes y roles autorizados]  
**Rama de trabajo:** `qa/securebank-automatizacion`  
**Repositorio:** `https://github.com/Rayst7/securebank`  
**Commit exacto evaluado:** **Pendiente de registrar** (SHA de las ejecuciones)  
**Fecha de corte del informe:** 5 de noviembre de 2026  
**Estado:** **Informe técnico de cierre de actividades ejecutadas; liberación NO aprobada formalmente.**

> **Control de evidencia.** Este documento distingue (a) resultados comunicados y respaldados por registros identificados durante el trabajo de QA, (b) rutas de evidencia presentes en el entorno local que aún requieren verificación individual y (c) verificaciones pendientes. No atribuye resultados a un commit de producción ni declara una certificación de seguridad integral. El total de 76 se refiere a escenarios únicos aprobados en las ejecuciones de QA registradas, no al total de todos los intentos ni a una garantía de cobertura funcional completa.

---

## Resumen ejecutivo

El proceso de aseguramiento de la calidad de **SecureBank**, una plataforma de banca digital simulada, abordó pruebas funcionales, unitarias, de API, de integración, web, móvil, de rendimiento, análisis estático, análisis de dependencias, seguridad dinámica y accesibilidad. Se prepararon scripts automatizados, documentación de pruebas, matrices y registros de evidencia para facilitar la reproducción y la trazabilidad de los resultados.

Como resultado de las ejecuciones realizadas se consolidaron **76 escenarios automatizados únicos aprobados**, integrados por **58 escenarios previos a la fase móvil y 18 escenarios móviles de Maestro**. Entre los resultados expresamente registrados están **36/36 pruebas Jest**, **10 casos de API**, **5 pruebas web con Cypress**, escenarios sobre Redis y RabbitMQ, **tres campañas k6** y **18/18 flujos móviles**. Esas cifras de familias pueden provenir de clasificaciones diferentes y no deben sumarse nuevamente para calcular el total consolidado; el inventario individual debe contrastarse con la matriz de casos y sus evidencias.

Los controles complementarios encontraron oportunidades de mejora relevantes: SonarQube informó **4 hallazgos** y una cobertura del **17,7 % para el alcance analizado en su proyecto**; el reporte local de Jest mostró una cobertura de **41,43 % en su propio alcance**. `npm audit` registró **9 vulnerabilidades en dependencias de producción del backend (7 altas y 2 moderadas)** y **35 en el análisis total del backend**. OWASP Dependency-Check asoció **36 hallazgos a 11 dependencias**; OWASP ZAP Baseline presentó **60 PASS, 8 WARN y 0 FAIL**. Estos resultados requieren revisión, priorización y, cuando proceda, corrección y revalidación.

En accesibilidad y calidad web, Lighthouse informó puntuaciones de **100 en rendimiento**, **100 en accesibilidad**, **100 en buenas prácticas** y **91 en SEO** para la ejecución documentada. axe registró **30 comprobaciones satisfactorias, 0 violaciones detectadas y 1 verificación de contraste incompleta**. Esas mediciones describen la página y configuración evaluadas y no demuestran por sí solas conformidad WCAG integral.

La base de Jenkins quedó operativa en Docker y el **Build #2 del trabajo `SecureBank-QA-Pipeline` finalizó en `SUCCESS`** al validar Java 21, Git 2.47.3, Node.js 24.19.0 y npm 11.17.0. **Jenkins todavía no ha demostrado la ejecución desatendida de las pruebas reales de SecureBank**: la conexión a GitHub y el Pipeline de checkout, instalación y Jest permanecen pendientes de verificación.

**Conclusión de liberación:** el trabajo de QA ejecutado ofrece evidencia valiosa, pero **no se recomienda declarar GO de producción** sin verificar criterios críticos de integridad bancaria y autorización, resolver o aceptar formalmente los riesgos relevantes, confirmar el Quality Gate y completar la integración continua reproducible. La decisión formal corresponde a los responsables autorizados del proyecto.

## 1. Introducción

El aseguramiento de la calidad es una disciplina orientada a verificar que un producto cumple los requisitos funcionales y no funcionales establecidos, así como a identificar riesgos antes de una eventual liberación. En una plataforma de banca simulada, resultan particularmente sensibles la autenticación, la autorización, la exactitud de saldos, la integridad de transferencias y pagos, la trazabilidad de los movimientos y la resiliencia ante fallos de infraestructura.

Este informe integra la metodología aplicada, las herramientas utilizadas, los resultados disponibles, la identificación de defectos y riesgos y la situación actual de automatización, utilizando como referencia el plan de pruebas, las matrices y los registros locales de QA. El documento es un **cierre técnico del trabajo realizado a la fecha indicada**; no sustituye una aprobación formal de despliegue.

## 2. Objetivos

### 2.1 Objetivo general

Evaluar la calidad funcional, técnica, de seguridad y rendimiento de SecureBank mediante pruebas automatizadas y análisis especializados, con resultados trazables que respalden la detección de defectos, la gestión de riesgos y las decisiones de continuidad del proyecto.

### 2.2 Objetivos específicos

1. **Verificar** los comportamientos de las funciones bancarias y de autenticación mediante pruebas unitarias, de integración, de API y de interfaz web y móvil.
2. **Evaluar** el rendimiento, la seguridad de la aplicación, las dependencias, la cobertura del código y la accesibilidad mediante herramientas especializadas.
3. **Documentar** los escenarios, resultados, evidencias, riesgos residuales y condiciones necesarias para la reproducción y futura integración continua de las pruebas.

## 3. Alcance y exclusiones

**Alcance trabajado:** autenticación y sesiones; cuentas, movimientos, beneficiarios, pagos y transferencias; acceso protegido en web; pruebas de API; mecanismos de Redis y RabbitMQ; base de datos PostgreSQL en ambiente de QA; pruebas móviles con Maestro; campañas de carga con k6; SAST/calidad con SonarQube; SCA con `npm audit` y OWASP Dependency-Check; análisis pasivo con ZAP; accesibilidad y experiencia web mediante Lighthouse y axe; preparación básica de Jenkins.

**Exclusiones y límites:** no se trabajó con dinero real ni se autorizaron ataques sobre terceros o ambientes de producción. No se dispone en este cierre de evidencia suficiente para afirmar pruebas completas de todas las rutas autenticadas, recuperación ante desastres, evaluación formal de usabilidad con cinco participantes, operación de infraestructura cloud, ejecución del conjunto completo en Jenkins ni conformidad exhaustiva con normas de accesibilidad o seguridad. Un requisito listado en el plan pero sin ejecución comprobable permanece **pendiente**.

## 4. Descripción y arquitectura del sistema

SecureBank se presenta como una aplicación de banca digital simulada con frontend web **React/Vite**, backend **NestJS/TypeScript**, acceso a datos mediante **Prisma y PostgreSQL**, apoyo de **Redis** y mensajería **RabbitMQ**. El repositorio también comprende una aplicación móvil usada durante la fase de pruebas con Expo Go y emulador Android.

Flujo lógico de referencia: **cliente web o móvil → API NestJS → servicios de negocio → Prisma/PostgreSQL**; de manera complementaria, los servicios se integran con Redis para mecanismos asociados a acceso y con RabbitMQ para mensajería asíncrona. Esta es una descripción lógica para QA; el diagrama definitivo debe contrastarse con la versión exacta del código y del despliegue.

| Componente | Tecnología / función | Estado de verificación |
|---|---|---|
| Backend | NestJS, TypeScript, Node.js | Pruebas Jest y API registradas |
| Frontend | React, Vite | Pruebas web Cypress y auditoría Lighthouse/axe registradas |
| Aplicación móvil | Aplicación lanzada en Expo Go; pruebas con Maestro | 18 flujos aprobados en ejecuciones individuales |
| Base de datos | PostgreSQL, Prisma | Evidencia local de cuentas/transferencias; integridad completa requiere contraste por caso |
| Caché / controles | Redis | Pruebas de integración/rate limiting registradas |
| Mensajería | RabbitMQ | Pruebas de integración y script QA presentes |
| Contenedores | Docker / Compose | Entorno local empleado; configuración compartida pendiente de revisar antes de Git |
| CI | Jenkins Docker | Build #2 de herramientas aprobado; pruebas reales en CI pendientes |

## 5. Estrategia y metodología de QA

Se adoptó una estrategia escalonada: primero comprobaciones unitarias y de servicios, después integración y API, pruebas funcionales web y móvil, análisis de seguridad/calidad y campañas de rendimiento. La ejecución de casos automatizados se complementó con evidencia de consola, reportes estructurados y capturas cuando estuvieron disponibles.

Los criterios de diseño priorizaron rutas felices y errores controlados, controles de acceso, entradas inválidas, consistencia de saldos, repetición de solicitudes, dependencias externas y regresión. Los casos de mayor impacto potencial se asociaron a riesgos **P0** en el plan de pruebas: idempotencia, concurrencia, autorización, consistencia de saldos, rollback y pérdida de eventos.

La trazabilidad esperada es **requisito → riesgo → caso → ejecución → resultado → archivo de evidencia → defecto/Issue → re-prueba**. La matriz vigente y el inventario de resultados deben revisarse para asegurar que cada uno de los 76 escenarios únicos tenga identificación y evidencia correspondiente.

## 6. Entorno, datos y herramientas

| Elemento | Dato disponible |
|---|---|
| Sistema de trabajo | Windows 11 y PowerShell; contenedores Docker |
| Repositorio | `https://github.com/Rayst7/securebank` |
| Rama QA | `qa/securebank-automatizacion` |
| API local de referencia | `http://localhost:3000` |
| Frontend local de referencia | `http://localhost:5173` |
| Jenkins local | `http://localhost:8080` |
| Node.js / npm probados dentro de Jenkins | v24.19.0 / 11.17.0 |
| Git / Java probados dentro de Jenkins | 2.47.3 / OpenJDK 21 |
| Móvil | Emulador `emulator-5554`; Expo Go `host.exp.exponent`; Metro en 8081 |
| Commit SHA y versión de release | No suministrados; registrar antes de una liberación formal |
| Configuración exacta de CPU, RAM, base de datos e imágenes | No consolidada en los registros recibidos |

Se emplearon credenciales y cuentas de prueba para la ejecución, pero **no deben incluirse contraseñas, JWT, claves privadas, valores de `.env` ni datos personales/bancarios identificables** en documentos o evidencias publicadas. Las capturas y exportaciones SQL/CSV deben anonimizarse antes de compartirlas.

## 7. Resumen consolidado de ejecución

| Familia / control | Resultado documentado | Interpretación |
|---|---|---|
| Consolidado de escenarios automatizados únicos | **76 aprobados** | 58 antes de la fase móvil + 18 móviles; no equivale a todos los requisitos cubiertos |
| Backend / Jest | **36/36 aprobadas** | Resultado de ejecución local |
| API | **10 casos aprobados** | Automatización local registrada |
| Interfaz web / Cypress | **5 casos aprobados** | Incluye regresiones y acceso web |
| Integración Redis | Pruebas de integración/rate limiting ejecutadas | No se dispone aquí de recuento individual inequívoco |
| Integración RabbitMQ | **3 casos registrados como aprobados** | Contrastar con scripts y consola |
| Campañas k6 | **3 escenarios/campañas ejecutados** | Load, stress y spike; métricas p95/p99 por recuperar |
| Móvil / Maestro | **18/18 aprobadas** | Flujos finales individualmente aprobados; algunos exigieron preparación manual |
| SonarQube, ZAP, SCA y accesibilidad | Análisis ejecutados | Son evaluaciones complementarias y NO se cuentan como escenarios de PASS funcional |
| Jenkins | Build #2: **SUCCESS** | Verificación de herramientas; NO ejecución de Jest/API/Cypress desde CI |

**Precisión estadística:** no se calcula aquí una tasa general de aprobación sobre el total planificado porque no se ha consolidado el número de todos los casos planificados, intentos fallidos/reintentados y bloqueados. En particular, las versiones intermedias fallidas de flujos móviles no deben desaparecer del historial ni contarse como casos nuevos aprobados.

## 8. Pruebas unitarias y cobertura

La suite unitaria del backend se ejecutó mediante **Jest** y se registraron **36 pruebas aprobadas de 36 ejecutadas**. El reporte de cobertura local informó **41,43 %** para el alcance medido por esa ejecución. Se dispone de evidencia de cobertura dentro de `reports/qa-evidence/20261104_205354-unit/coverage/`, incluidos `lcov.info`, `clover.xml`, `coverage-final.json` e informe HTML.

**Interpretación:** la aprobación de 36 pruebas confirma sus expectativas concretas, pero la cobertura observada indica que existen áreas no ejercitadas por la suite. El porcentaje local de Jest **no es directamente comparable** con el de SonarQube, dado que el alcance, las exclusiones y el método de agregación pueden ser distintos. Antes de adoptar un umbral de cobertura deben acordarse el alcance, la métrica y las clases/módulos críticos.

**Pendiente:** asociar cada suite con los requisitos P0 y verificar cobertura específica de autenticación, servicios bancarios, errores de base de datos, concurrencia, idempotencia y recuperación.

## 9. Pruebas de integración, Redis y RabbitMQ

La automatización incluye `tests/integration/redis.test.mjs`, `tests/integration/rabbitmq.test.mjs` y `backend/scripts/qa-rabbitmq-real.ts`. También se prepararon scripts PowerShell para facilitar las ejecuciones y la conservación de evidencia.

En Redis se registraron verificaciones relacionadas con integración y límites de intentos; para RabbitMQ se documentaron tres casos aprobados y un archivo de estado final de colas en `reports/qa-evidence/20261104_231228-rabbitmq/estado-final-colas.txt`. No es suficiente que los contenedores estén activos: las conclusiones deben vincularse a aserciones sobre efectos de negocio, publicación, consumo, reintentos y estados observados.

**No se declara verificado** el comportamiento integral ante indisponibilidad prolongada, recuperación del consumidor, tolerancia a mensajes duplicados o dead-letter queues (DLQ) en todos los escenarios críticos, a menos que se adjunten sus pruebas específicas. Tampoco se concluye que no exista pérdida de eventos únicamente por una corrida exitosa.

## 10. Pruebas de API y consistencia bancaria

Se registraron **10 casos aprobados de API**. Los artefactos de automatización preparados para versionar son `tests/api/bank.api.test.mjs` y `tests/api/securebank.postman_collection.json`. En los reportes locales se encuentran logs API y exportaciones de estados anteriores y posteriores a operaciones bancarias.

| Aspecto crítico | Verificación esperada | Estado del informe |
|---|---|---|
| Autenticación y JWT | Rechazo de credenciales y tokens inválidos | Pruebas de API registradas; detallar por ID |
| Autorización / IDOR | Acceso restringido a recursos del usuario autorizado | Cobertura exhaustiva no demostrada con la información disponible |
| Transferencias / pagos | Respuestas, movimientos y saldos consistentes | Evidencia local de cuentas y transferencias; vincular aserciones |
| Doble envío / idempotencia | Evitar efectos financieros duplicados | Requiere confirmar caso, clave y resultados observados por transacción |
| Concurrencia | Aislamiento, consistencia e integridad | No se dispone aquí de métricas numéricas y aserciones finales verificadas |
| Auditoría | Registro de operaciones trazable y consistente | Existe archivo de integridad/auditoría; contrastar contenido |

El conjunto local `reports/qa-evidence/20261104_214554-banking/` contiene archivos `antes-cuentas.csv`, `despues-cuentas.csv`, `antes-transferencias.csv`, `despues-transferencias.csv` e `integridad-auditoria.csv`. **Deben conservarse como evidencia privada y depurarse antes de su eventual difusión.**

## 11. Pruebas web con Cypress

Se registraron **cinco pruebas web aprobadas** en la ejecución final considerada. El código fuente de automatización está en `tests/cypress/e2e/securebank.cy.js` y su configuración en `cypress.config.cjs`.

La evidencia local comprende capturas de rutas protegidas, validación de correo, dashboard, pagos, transferencias y cierre de sesión. También existen capturas de intentos fallidos y videos de Cypress: deben conservarse para el análisis de regresión, pero no confundirse con el resultado final de los cinco casos. Rutas observadas: `reports/qa-evidence/cypress/screenshots/` y `reports/qa-evidence/cypress/videos/`.

La aprobación de los flujos web documentados no demuestra que toda la navegación y todas las combinaciones de roles hayan sido verificadas. Para los próximos ciclos es recomendable vincular cada captura y resultado a un caso, versión, fecha y usuario de prueba sintético.

## 12. Pruebas móviles con Maestro

Se ejecutaron y aprobaron individualmente **18 escenarios móviles de Maestro**. Los archivos YAML finales están identificados como `TC-MOB-01.yaml` a `TC-MOB-18.yaml`, con versiones corregidas para los casos 08, 09, 10, 15 y 16. Los **18 archivos aprobados ya se copiaron y prepararon en Git** dentro de `tests/maestro/flows/`; los 29 archivos encontrados originalmente incluían versiones intermedias.

| Casos | Archivo final | Resultado reportado |
|---|---|---|
| 01–07 | `TC-MOB-01.yaml` a `TC-MOB-07.yaml` | Aprobados; comprobar detalle funcional en cada YAML |
| 08–10 | `TC-MOB-08-v2.yaml`, `09-v2`, `10-v2` | Aprobados tras ajustes |
| 11–14 | `TC-MOB-11.yaml` a `TC-MOB-14.yaml` | Aprobados |
| 15 | `TC-MOB-15-v2.yaml` | Aprobado tras ajuste |
| 16 | `TC-MOB-16-v8.yaml` | Aprobado: consulta/actualización de movimientos; 6 s en registro final |
| 17 | `TC-MOB-17.yaml` | Aprobado: historial; 7 s en registro final |
| 18 | `TC-MOB-18.yaml` | Aprobado: beneficiarios; 13 s en registro final |

**Limitación de reproducibilidad:** los últimos casos se ejecutaron con Expo Go y emulador Android en un contexto que requirió preparación manual de sesión y pantalla inicial. Para estabilizar pruebas se ejecutó Metro con `EXPO_NO_DEV_MENU=1` en el puerto 8081. Esto explica la aprobación individual, pero **no significa que los 18 flujos sean todavía ejecutables sin intervención en un agente Jenkins**. La etapa de movilidad en CI queda pendiente.

## 13. Seguridad, dependencias y calidad estática

| Herramienta | Resultado disponible | Interpretación / pendiente |
|---|---|---|
| SonarQube | **4 hallazgos**; cobertura **17,7 %** en el alcance de Sonar | Revisar severidad, Quality Gate y cobertura del código; gate no acreditado aquí |
| `npm audit` backend (producción) | **9 vulnerabilidades: 7 altas y 2 moderadas** | Priorizar por explotabilidad, dependencia afectada y versión corregida |
| `npm audit` backend (total) | **35 vulnerabilidades reportadas** | Alcance total distinto del análisis exclusivo de producción |
| `npm audit` frontend | Reporte generado | Recuento y severidad no verificados en la información disponible |
| OWASP Dependency-Check | **11 dependencias** y **36 asociaciones de hallazgos** | Asociaciones no equivalen necesariamente a 36 CVE distintas |
| OWASP ZAP Baseline | **60 PASS, 8 WARN, 0 FAIL** | Diagnóstico pasivo/de alcance limitado; revisar cada advertencia |
| Fortify SAST | Sin informe de ejecución verificable en este cierre | Pendiente, no marcar como aprobado |
| Pruebas específicas IDOR/JWT/permisos | Parte del alcance de QA | No declarar cobertura integral de seguridad sin matriz detallada |

Las cifras anteriores reflejan salidas de herramientas, no juicios independientes sobre exploitabilidad ni certificaciones. Un **0 FAIL** en una línea base ZAP no garantiza ausencia de vulnerabilidades, especialmente en rutas protegidas no recorridas o pruebas activas no realizadas.

Se registraron archivos de respaldo en `reports/qa-evidence/security/` y `reports/qa-evidence/20261105-sonarqube/`. La revisión de Git detectó **19 archivos preparados con coincidencias textuales** de términos como `password`, `token` o `authorization`. Una coincidencia no equivale a un secreto filtrado, pero **la publicación debe bloquearse hasta inspeccionar los valores reales y eliminar cualquier dato sensible**.

## 14. Rendimiento y resiliencia

Se realizaron **tres campañas k6 identificadas como load, stress y spike**, con salidas `summary.json` localizadas en:

- `reports/qa-evidence/20261105_012807-load/summary.json`
- `reports/qa-evidence/20261105_013312-stress/summary.json`
- `reports/qa-evidence/20261105_014342-spike/summary.json`

| Campaña | Evidencia local | Resultado de ejecución | p95 / p99 / error % |
|---|---|---|---|
| Load | `20261105_012807-load/summary.json` | Ejecutada | Pendiente de transcribir del JSON |
| Stress | `20261105_013312-stress/summary.json` | Ejecutada | Pendiente de transcribir del JSON |
| Spike | `20261105_014342-spike/summary.json` | Ejecutada | Pendiente de transcribir del JSON |

Los scripts versionables se encuentran en `tests/performance/securebank.js` y `tests/performance/transfers.js`. **No se declara cumplimiento de umbrales de latencia o disponibilidad** porque el resumen aportado no contiene los valores de p95, p99, tasa de error, throughput, VU o CPU/RAM necesarios para esa conclusión.

Para una evaluación formal deben registrarse los límites aprobados antes de ejecutar, la cantidad de usuarios virtuales, la duración, el tamaño de datos, la infraestructura, el commit y el estado del sistema después de la carga, especialmente en operaciones que alteran saldos.

## 15. Accesibilidad, experiencia web y usabilidad

| Instrumento | Indicador | Resultado observado |
|---|---|---|
| Lighthouse | Rendimiento | 100 |
| Lighthouse | Accesibilidad | 100 |
| Lighthouse | Buenas prácticas | 100 |
| Lighthouse | SEO | 91 |
| axe | Verificaciones satisfactorias | 30 |
| axe | Violaciones detectadas | 0 |
| axe | Revisión de contraste incompleta | 1 |

Estos resultados corresponden a las auditorías ejecutadas y no pueden generalizarse automáticamente a todas las pantallas, tamaños de dispositivo o estados de la aplicación. El control incompleto de contraste requiere revisión específica. También permanecen pendientes de confirmación las pruebas manuales de navegación por teclado, lector de pantalla y formularios en error.

El plan original contempló una prueba de usabilidad con al menos cinco participantes y consentimiento informado. **No se ha aportado un registro verificable de sesiones con participantes**, por lo que ese componente permanece pendiente y no se le asignan resultados inventados.

## 16. Integración continua: Jenkins

Jenkins fue iniciado y recuperado en un contenedor Docker existente, con almacenamiento persistente en `/var/jenkins_home`. Se creó el trabajo **`SecureBank-QA-Pipeline`**. El Build #1 falló cuando Node.js 26.13.0 intentó cargar la biblioteca `libatomic.so.1` no disponible en el contenedor. Después se configuró la herramienta **`NodeJS-24-QA`** con Node.js 24.19.0 y npm 11.17.0.

El **Build #2** terminó con `Finished: SUCCESS` y verificó Git 2.47.3, OpenJDK 21, Node.js 24.19.0 y npm 11.17.0. Las tres etapas del Pipeline inicial —verificar Jenkins, verificar Node y confirmar entorno— finalizaron satisfactoriamente.

**Estado real al corte:** se proporcionó un Pipeline posterior para clonar `qa/securebank-automatizacion` y ejecutar Jest, pero **no existe aquí una salida de consola que confirme su Build #3 ni la ejecución de pruebas reales en Jenkins**. La verificación de acceso GitHub desde el contenedor también quedó pendiente. En consecuencia, la integración continua está **iniciada, no finalizada**.

## 17. Gestión de defectos, riesgos y re-pruebas

Para SecureBank deben priorizarse los riesgos que afecten saldos, autorización, eventos de mensajería o protección de información. La siguiente tabla **clasifica riesgos a gestionar**, no afirma que todos sean defectos reproducidos.

| Riesgo / área | Prioridad recomendada | Evidencia existente | Acción requerida |
|---|---|---|---|
| Doble débito, idempotencia y concurrencia | P0 | Exportaciones bancarias y scripts API/k6 | Validar aserciones de un solo efecto y consistencia transaccional |
| Autorización, JWT e IDOR | P0 | Casos API y auditorías parciales | Ampliar pruebas autenticadas por propietario y rol |
| Dependencias vulnerables | Alta | `npm audit`, Dependency-Check | Evaluar CVEs, parches y retest |
| Cobertura insuficiente | Alta | Jest 41,43 %; Sonar 17,7 % | Aumentar cobertura en rutas críticas y aclarar alcances |
| Redis / RabbitMQ: pérdida o duplicación | Alta | Scripts y estado de colas | Confirmar reintentos, persistencia, recuperación y DLQ |
| Advertencias ZAP | Media–alta según hallazgo | 8 WARN | Clasificar, corregir o aceptar con fundamento |
| Ejecución CI no reproducible | Alta para entrega CI | Build #2 solo verifica herramientas | Completar checkout, pruebas, artefactos y gates |
| Contraste de interfaz incompleto | Media | axe: 1 comprobación incompleta | Revisión manual y evidencia |
| Exposición de secretos en Git | Alta | Coincidencias en 19 archivos preparados | Inspección local antes del push; saneamiento si procede |

Las observaciones deben registrarse en la matriz de defectos y, cuando corresponda, en GitHub Issues, con identificador, severidad, prioridad, pasos de reproducción, evidencia, responsable, corrección y re-prueba. No se asignan aquí estados «cerrado» o «resuelto» sin un Issue y una revalidación documentada.

## 18. Criterios de entrada, salida y decisión GO / NO-GO

| Criterio de salida propuesto | Estado al 05/11/2026 | Comentario |
|---|---|---|
| Casos funcionales automatizados ejecutados | Parcialmente cumplido | 76 escenarios únicos aprobados; falta trazabilidad contra todo el alcance |
| Casos P0 completos, ejecutados y aprobados | No acreditado | Revisar idempotencia, concurrencia y autorización |
| Vulnerabilidades críticas/altas resueltas o aceptadas formalmente | No acreditado | Existen hallazgos altos en dependencias |
| Quality Gate SonarQube aprobado | No acreditado | Solo se dispone de hallazgos y cobertura |
| Umbrales de k6 aprobados | No acreditado | Falta extraer métricas y criterios firmados |
| Jenkins ejecuta tests reales y publica evidencia | Pendiente | Build #2 verifica herramientas, no pruebas |
| Reportes y trazabilidad por SHA | Parcial | Existen archivos locales; SHA exacto no consolidado |
| Aprobación formal responsable del proyecto | Pendiente | No se aportó acta o autorización |

**Decisión técnica recomendada:** **PENDIENTE / NO-GO preventivo para una liberación de producción** hasta subsanar o aceptar formalmente riesgos relevantes y completar criterios P0. Esta recomendación no reemplaza la decisión del líder técnico, docente o responsable designado. SecureBank puede continuar en ambiente QA para ejercicios y correcciones controladas.

## 19. Evidencias, conservación y publicación responsable

Los resultados deben conservarse con fecha, caso, estado, versión/commit y una ruta o identificador que permita reproducirlos. El inventario siguiente resume archivos locales **observados en listados**, no una verificación del contenido de cada archivo.

| ID | Tipo | Ruta de referencia | Tratamiento |
|---|---|---|---|
| EV-01 | Cobertura Jest | `reports/qa-evidence/20261104_205354-unit/coverage/` | Conservar privado; publicar resumen depurado |
| EV-02 | API | `reports/qa-evidence/20261104_213032-api/` | Revisar logs por JWT o datos de prueba |
| EV-03 | Integridad bancaria | `reports/qa-evidence/20261104_214554-banking/` | **Privado**, revisar identificadores y saldos |
| EV-04 | Cypress | `reports/qa-evidence/cypress/` | Seleccionar capturas anonimizadas; evitar videos masivos |
| EV-05 | RabbitMQ | `reports/qa-evidence/20261104_231228-rabbitmq/` | Revisar datos y conservar resultado de colas |
| EV-06 | SonarQube | `reports/qa-evidence/20261105-sonarqube/` | Publicar métricas resumidas sin tokens |
| EV-07 | Rendimiento k6 | `reports/qa-evidence/20261105_012807-load/` y escenarios relacionados | Publicar resumen, no logs sensibles |
| EV-08 | Auditorías SCA | `reports/qa-evidence/security/` | Revisar y resumir riesgos |
| EV-09 | Maestro | `tests/maestro/flows/` y `QA_Evidencias/Maestro/` | Subir YAML depurados; reportes locales privados |
| EV-10 | Jenkins | `SecureBank-QA-Pipeline` Build #2, Jenkins local | Captura/log privado y registro del resultado SUCCESS |

**Política de Git:** versionar código de pruebas, scripts, matrices, este informe en Markdown y, si lo permite el equipo, su edición en Word. No subir `.env`, secretos, `.scannerwork`, artefactos de herramientas, directorios de dependencias, videos extensos ni exportaciones bancarias sin anonimización. En esta etapa se prepararon 36 archivos de pruebas/documentación en Git y se detectaron modificaciones locales adicionales en `docker-compose.yml`, `package.json` y `package-lock.json`, que requieren revisión antes de incluirse. La existencia de archivos preparados **no implica que ya estén publicados**.

## 20. Conclusiones y recomendaciones

El trabajo de QA produjo una base de automatización concreta y diversos informes técnicos sobre SecureBank. El principal resultado funcional documentado es la aprobación de **76 escenarios únicos** y, de forma destacada, **18 pruebas móviles finales** mediante Maestro. La existencia de automatización para backend, API, web, integración y rendimiento facilita futuras regresiones y el intercambio de evidencia con el equipo.

Sin embargo, también se identificaron limitaciones de cobertura, vulnerabilidades de dependencias, advertencias del escaneo dinámico y ausencia de una ejecución completa desatendida en CI. Por ello, los resultados satisfactorios de las pruebas ejecutadas **no justifican declarar que todo el sistema es seguro, está libre de defectos o está preparado para producción**.

Se recomienda: (1) publicar de forma controlada los archivos fuente de QA y este informe; (2) completar la trazabilidad caso–resultado–SHA y depurar evidencias; (3) priorizar riesgos P0 de autorización e integridad; (4) atender y revalidar hallazgos SCA/Sonar/ZAP; (5) aumentar cobertura de rutas críticas; (6) extraer las métricas reales de k6; (7) completar Jenkins con agente, checkout y reportes JUnit; y (8) preparar autenticación y estado inicial reproducibles para ejecutar Maestro sin intervención manual.

La entrega puede presentar con fundamento el **trabajo de aseguramiento realizado hasta el corte**, sus logros, limitaciones y plan de corrección. La aprobación formal de una eventual liberación queda pendiente.

---

# Anexos

## Anexo A. Inventario de archivos fuente de QA recomendados para GitHub

| Categoría | Rutas / archivos |
|---|---|
| Pruebas API | `tests/api/bank.api.test.mjs`, `tests/api/securebank.postman_collection.json` |
| Pruebas web | `tests/cypress/e2e/securebank.cy.js`, `cypress.config.cjs` |
| Integración | `tests/integration/redis.test.mjs`, `tests/integration/rabbitmq.test.mjs`, `backend/scripts/qa-rabbitmq-real.ts` |
| Rendimiento | `tests/performance/securebank.js`, `tests/performance/transfers.js` |
| Móvil | `tests/maestro/README.md`, `tests/maestro/flows/` con 18 YAML finales |
| Scripts auxiliares | `scripts/Ejecutar-QA.ps1`, `scripts/Ejecutar-RabbitMQ-QA.ps1`, `scripts/Guardar-Evidencia.ps1` |
| Plan y matrices | `docs/plan-pruebas-qa.md`, `docs/matriz-casos-prueba.csv`, `docs/matriz-riesgos-qa.csv`, `docs/registro-defectos.csv` |
| Documentos | `docs/control-qa-securebank.xlsx`, `docs/informe-qa-securebank-plantilla.docx`, informe final Markdown y Word |
| Orientaciones QA | `README_QA_INICIO.md`, `README_RABBITMQ_QA.md`, `docs/mapa-entregables-y-gates.md` |

**Nota:** la inclusión real depende de revisar secretos, tamaño, autoría y modificaciones compartidas. Un archivo listado como recomendado no necesariamente está listo para publicarse sin inspección.

## Anexo B. Flujos móviles finales identificados

`TC-MOB-01.yaml`, `TC-MOB-02.yaml`, `TC-MOB-03.yaml`, `TC-MOB-04.yaml`, `TC-MOB-05.yaml`, `TC-MOB-06.yaml`, `TC-MOB-07.yaml`, `TC-MOB-08-v2.yaml`, `TC-MOB-09-v2.yaml`, `TC-MOB-10-v2.yaml`, `TC-MOB-11.yaml`, `TC-MOB-12.yaml`, `TC-MOB-13.yaml`, `TC-MOB-14.yaml`, `TC-MOB-15-v2.yaml`, `TC-MOB-16-v8.yaml`, `TC-MOB-17.yaml` y `TC-MOB-18.yaml`.

## Anexo C. Campos de control documental por completar antes de una entrega firmada

| Dato | Estado |
|---|---|
| Nombre completo, carné, integrantes y docente | Por completar |
| SHA completo del commit utilizado en cada ejecución | Por reconciliar con los reportes |
| Versión/release, imágenes Docker y ambiente exacto | Por documentar |
| Total planificado y fallos/bloqueos del inventario integral | Por conciliar con la matriz |
| Resultados p95/p99, tasa de error y throughput de k6 | Por extraer de los `summary.json` |
| Severidad/estado individual de los 4 hallazgos de SonarQube | Por revisar |
| Resultado formal de Quality Gate | Por acreditar |
| Estado individual de vulnerabilidades y aprobaciones de riesgo | Por registrar |
| Estado de Fortify y usabilidad con participantes | Sin evidencia verificable |
| Build Jenkins con las pruebas reales | Pendiente |
| Aprobación y firma de liberación | Pendiente |

## Anexo D. Glosario

**QA:** aseguramiento de la calidad. **CI:** integración continua. **SAST:** análisis estático de seguridad. **SCA:** análisis de componentes y dependencias. **DAST:** análisis dinámico de seguridad. **P0:** prioridad máxima de prueba o corrección según el plan. **Quality Gate:** conjunto de condiciones automáticas de aceptación de calidad. **p95:** percentil 95 de una distribución de tiempos de respuesta. **JWT:** token de autenticación. **IDOR:** acceso no autorizado a recursos por referencia insegura. **DLQ:** cola de mensajes no procesados tras condiciones definidas. **GO/NO-GO:** decisión formal de autorizar o no una liberación.

---

**Fin del informe.** Preparado a partir de resultados reportados en el seguimiento de QA, documentación base del proyecto y listados de artefactos locales disponibles hasta el 5 de noviembre de 2026. Cualquier nueva versión debe registrar responsable, fecha, SHA del código evaluado y cambios frente a este corte.
