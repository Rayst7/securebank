# INFORME FINAL DE ASEGURAMIENTO DE LA CALIDAD — SECUREBANK

**Universidad Mariano Gálvez · Ingeniería en Sistemas · Curso 048**

**Autor QA:** [NOMBRE]  
**Rama:** qa/securebank-automatizacion  
**Commit evaluado:** [SHA]  
**Versión:** [RELEASE] · **Fecha:** [FECHA]

## Resumen ejecutivo
[Qué se evaluó, qué se pudo ejecutar, qué quedó bloqueado, principales riesgos y decisión.]

## 1. Objetivo y alcance
[Proyecto, componentes, módulos y ambiente QA independiente.]

## 2. Ambiente y metodología
[OS, versiones, Compose, Node, navegador, emulador, IP/URL QA, commit, datos sintéticos y herramientas/versiones.]

## 3. Inventario y resultados por tipo de prueba

| Tipo | Planificados | Ejecutados | Aprobados | Fallidos | Bloqueados | Evidencia |
|---|---:|---:|---:|---:|---:|---|
| Unitaria | — | — | — | — | — | [ruta] |
| Integración | — | — | — | — | — | [ruta] |
| API/Insomnia | — | — | — | — | — | [ruta] |
| Web/Cypress | — | — | — | — | — | [ruta] |
| Móvil/Maestro | — | — | — | — | — | [ruta] |
| Rendimiento/k6 | — | — | — | — | — | [ruta] |
| SAST/SCA/DAST | — | — | — | — | — | [ruta] |
| Accesibilidad | — | — | — | — | — | [ruta] |
| Usabilidad usuarios | — | — | — | — | — | [ruta] |

## 4. Evidencias principales
- E-001: [screenshot/video], commit [SHA], fecha [FECHA], caso [ID], resultado [REAL]
- E-002: ...

## 5. Integridad bancaria e idempotencia
[Saldo A/B antes y después, número de solicitudes simultáneas, HTTP observados, transferencias/ movimientos persistidos, conclusiones.]

## 6. Redis y RabbitMQ
[HIT/MISS/TTL/invalidez/caída/recovery, retry/DLQ, número mensajes ACK, pérdida/duplicación eventual.]

## 7. Seguridad
[SonarQube Quality Gate, hallazgos Fortify, CVE y dependencias, ZAP; severidad/acción/del riesgo.]

## 8. Rendimiento

| Escenario | VUs | p95 ms | Errores % | Throughput req/s | CPU/RAM | Umbral cumplido |
|---|---:|---:|---:|---:|---|---|
| Load | — | — | — | — | — | — |
| Stress | — | — | — | — | — | — |
| Spike | — | — | — | — | — | — |

## 9. Usabilidad y accesibilidad
[Número de usuarios >=5, tareas, tasa de éxito, duración, satisfacción, WCAG problemas y Lighthouse/axe.]

## 10. Defectos y trazabilidad
[Resumen de issues por severidad, enlaces a bugs, PR correctivos y re-pruebas.]

## 11. Limitaciones y riesgos residuales
[Componentes no entregados, pruebas bloqueadas, herramientas con licencia/acceso pendientes y riesgos aceptados.]

## 12. Conclusión y decisión de liberación
**Decisión:** [GO / NO-GO / PENDIENTE]  
**Fundamento:** [EVIDENCIA REAL y criterios]  
**Aprobación de responsable:** [NOMBRE / FECHA]

## Anexos
[plan, matrices, reportes JSON/HTML/XML, hashes o enlaces de videos, Jenkins build, PR, Issues.]

> No incorporar credenciales reales, tokens, datos personales ni supuestos como si fueran resultados reales.
