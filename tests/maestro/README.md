# Maestro — pendiente de implementación del módulo móvil

En el ZIP revisado, `mobile/` solo contiene `.gitkeep`; no hay APK ni código móvil.
No generar capturas ficticias ni declarar pruebas PASSED.

Cuando el equipo entregue el APK Android, documentar: identificador de aplicación (`appId`),
versión, entorno QA y credenciales sintéticas. Crear 5–8 flujos YAML:

1. Login exitoso.
2. Login negativo.
3. Consulta de saldo.
4. Transferencia válida con datos aislados de QA.
5. Transferencia inválida o saldo insuficiente.
6. Historial de operaciones.
7. Cierre de sesión y ruta protegida.
8. Reconexión / error temporal de red (si está implementado).

Comandos con APK instalado en emulador:

```powershell
maestro test tests/maestro --format junit --output reports/qa-evidence/maestro-report.xml --test-output-dir reports/qa-evidence/maestro-artifacts
```

Las rutas exactas dependerán de los identificadores visuales reales de la app. No copiar
flujos para web: Maestro necesita app Android/iOS instalada en dispositivo/emulador.
Consultar: https://docs.maestro.dev/maestro-flows/workspace-management/test-reports-and-artifacts
