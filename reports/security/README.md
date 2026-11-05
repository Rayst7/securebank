# Evidencias de seguridad

- `npm-audit-backend.json`: auditoría de dependencias de producción del backend.
  Resultado: 0 críticas, 7 altas, 2 moderadas.
- `npm-audit-frontend.json`: auditoría de dependencias de producción del
  frontend. Resultado: 0 vulnerabilidades.

Generados con `npm audit --omit=dev --json` el 2026-11-04. No se ejecutó
`npm audit fix` para evitar cambios no revisados. Los reportes no contienen
secretos ni credenciales.
