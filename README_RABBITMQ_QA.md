# SecureBank — RabbitMQ QA real, aislado

Se entrega una prueba que usa `RabbitMQService` y `RabbitMQConsumer` reales, con `amqplib` real, en un vhost exclusivo `securebank_qa`. No usa mocks y no modifica PostgreSQL. No requiere detener el backend que ya corre contra el vhost `/`.

## Seguridad y preparación (una sola vez)

Desde la raíz del repositorio, confirmar que RabbitMQ está activo y crear un vhost independiente:

```powershell
docker exec securebank-rabbitmq rabbitmqctl add_vhost securebank_qa
docker exec securebank-rabbitmq rabbitmqctl set_permissions -p securebank_qa securebank ".*" ".*" ".*"
docker exec securebank-rabbitmq rabbitmqctl list_permissions -p securebank_qa
```

En el mismo PowerShell que ejecutará la suite, introducir la contraseña real del usuario local `securebank` (la misma que funciona con RabbitMQ):

```powershell
$clave = Read-Host 'Clave RabbitMQ QA local' -AsSecureString
$texto = [pscredential]::new('qa', $clave).GetNetworkCredential().Password
$codificada = [uri]::EscapeDataString($texto)
$env:QA_RABBITMQ_URL = "amqp://securebank:$codificada@127.0.0.1:5672/securebank_qa"
$env:QA_DB_ISOLATED = 'YES'
Remove-Variable clave, texto, codificada
```

**No imprimas ni guardes** `QA_RABBITMQ_URL`, no la pongas en `.env` o en Git; es una variable de la sesión actual.

## Ejecutar

```powershell
.\scripts\Ejecutar-RabbitMQ-QA.ps1
```

Si bloquea Windows el script: `Unblock-File .\scripts\Ejecutar-RabbitMQ-QA.ps1` o bien ejecutar con una política temporal para esa sesión. No hace falta reinstalar RabbitMQ ni reiniciar el backend.

La suite real:

- `INT-RABBIT-01`: usa el productor real SecureBank, publica `TransferCreated`, confirma recepción por el consumidor.
- `INT-RABBIT-02`: detiene solamente el consumidor QA, publica `PaymentCreated`, constata que queda en cola, lo reinicia y constata consumo.
- `INT-RABBIT-03`: publica JSON deliberadamente inválido, verifica tres reintentos (`x-retry-count=4`) y la DLQ. Conserva el mensaje rechazado como evidencia.

La tercera prueba tarda aproximadamente 15 segundos por el TTL del código; el límite configurado es 35 s. Las pruebas solo afectan al vhost `securebank_qa` y **no** tocan la cola del vhost `/`.

## Evidencias

La ejecución crea `reports/qa-evidence/FECHA-rabbitmq/consola.log` y `metadata.txt`. En otra terminal, al terminar:

```powershell
docker exec securebank-rabbitmq rabbitmqctl list_queues -p securebank_qa name messages_ready messages_unacknowledged consumers
```

Esperado: `securebank.events.queue` lista sin mensajes, `securebank.events.retry` lista sin mensajes y `securebank.events.dlq` con 1 mensaje preparado. No ejecutes de nuevo con el mismo vhost si la DLQ conserva mensajes de la corrida anterior: la suite falla deliberadamente para evitar confundir evidencias. Conserva los logs y capturas. Para una nueva corrida crea otro vhost de QA y adapta la validación del script, o archiva y acuerda una limpieza explícita de la DLQ QA.

La prueba no demuestra todavía persistencia empresarial de notificaciones, exactly-once delivery, integridad de transferencias bajo pérdida del broker ni que la publicación use confirm channels; esos riesgos requieren pruebas separadas.
