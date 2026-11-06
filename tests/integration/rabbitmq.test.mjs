/**
 * Integración de broker real con consumer SecureBank: inválido => retry => DLQ.
 * Requiere backend / RabbitMQ levantados y broker exclusivo para QA.
 * Solo se ejecuta bajo QA_BROKER_TESTS=1 y QA_DB_ISOLATED=YES.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import amqp from 'amqplib';

const enabled = process.env.QA_BROKER_TESTS === '1';
await test('INT-RABBIT-01 — mensaje inválido alcanza DLQ tras reintentos', { skip: !enabled }, async () => {
  assert.equal(process.env.QA_DB_ISOLATED, 'YES', 'No ejecutar en broker compartido/no QA');
  if (!process.env.QA_RABBITMQ_URL) throw new Error('Falta QA_RABBITMQ_URL de broker aislado');
  const connection = await amqp.connect(process.env.QA_RABBITMQ_URL);
  const channel = await connection.createConfirmChannel();
  try {
    const queue = 'securebank.events.dlq';
    const baseline = await channel.checkQueue(queue);
    const id = randomUUID();
    channel.publish('securebank.events', 'QA.Invalid', Buffer.from('{json-invalido:' + id), {
      persistent: true, contentType: 'application/json', messageId: id,
    });
    await channel.waitForConfirms();
    let count = baseline.messageCount;
    for (let attempt = 0; attempt < 30 && count < baseline.messageCount + 1; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      count = (await channel.checkQueue(queue)).messageCount;
    }
    assert.ok(count >= baseline.messageCount + 1,
      `No llegó mensaje a DLQ; inicial=${baseline.messageCount} final=${count}. Revisar consumer y retry.`);
    // No consumir ni eliminar DLQ automáticamente: la evidencia debe mantenerse.
  } finally {
    await channel.close();
    await connection.close();
  }
});
