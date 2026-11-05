/**
 * Integración real SecureBank <-> RabbitMQ, usando las clases de producción.
 * Requiere vhost aislado securebank_qa y NO modifica la base de datos.
 * Uso: cd backend && npx tsx scripts/qa-rabbitmq-real.ts
 * Variables: QA_RABBITMQ_URL y QA_DB_ISOLATED=YES.
 * El mensaje final queda en la DLQ como evidencia.
 */
import 'reflect-metadata';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import amqp from 'amqplib';
import type { ConfirmChannel, ChannelModel } from 'amqplib';
import { RabbitMQConsumer } from '../src/rabbitmq/rabbitmq.consumer.js';
import { RabbitMQService } from '../src/rabbitmq/rabbitmq.service.js';
import { BANKING_EVENTS } from '../src/rabbitmq/rabbitmq.constants.js';

const EVENT_QUEUE = 'securebank.events.queue';
const RETRY_QUEUE = 'securebank.events.retry';
const DLQ = 'securebank.events.dlq';
const EXCHANGE = 'securebank.events';

let consumer: RabbitMQConsumer | undefined;
let producer: RabbitMQService | undefined;
let conn: ChannelModel | undefined;
let channel: ConfirmChannel | undefined;
let eventLogs: string[] = [];

function attachEventLog(instance: RabbitMQConsumer) {
  const logger = (instance as unknown as { logger: { log: (message: string) => void } }).logger;
  const original = logger.log.bind(logger);
  logger.log = (message: string) => {
    eventLogs.push(String(message));
    original(message);
  };
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function until(check: () => Promise<boolean> | boolean, timeoutMs: number, label: string) {
  const deadline = Date.now() + timeoutMs;
  do {
    if (await check()) return;
    await sleep(250);
  } while (Date.now() < deadline);
  throw new Error(`No se cumplió el criterio de espera: ${label} (${timeoutMs} ms)`);
}

before(async () => {
  assert.equal(process.env.QA_DB_ISOLATED, 'YES', 'Requiere QA_DB_ISOLATED=YES');
  const url = process.env.QA_RABBITMQ_URL;
  assert.ok(url, 'Falta QA_RABBITMQ_URL');
  const parsed = new URL(url);
  assert.equal(parsed.protocol, 'amqp:', 'Solo AMQP local de QA');
  assert.ok(['127.0.0.1', 'localhost'].includes(parsed.hostname), 'Usa solo RabbitMQ local');
  assert.equal(decodeURIComponent(parsed.pathname), '/securebank_qa', 'Requiere el vhost aislado securebank_qa');

  // Solo se sobreescribe en ESTE proceso de pruebas, no en el backend ya iniciado.
  process.env.RABBITMQ_URL = url;
  consumer = new RabbitMQConsumer();
  attachEventLog(consumer);
  await consumer.onModuleInit();

  producer = new RabbitMQService();
  await producer.onModuleInit();

  conn = await amqp.connect(url);
  channel = await conn.createConfirmChannel();
  const main = await channel.checkQueue(EVENT_QUEUE);
  const retry = await channel.checkQueue(RETRY_QUEUE);
  const dead = await channel.checkQueue(DLQ);
  assert.equal(main.messageCount, 0, 'La cola principal QA debe comenzar vacía');
  assert.equal(retry.messageCount, 0, 'La cola retry QA debe comenzar vacía');
  assert.equal(dead.messageCount, 0, 'La DLQ QA debe comenzar vacía; no borres evidencia previa, usa vhost nuevo');
  assert.equal(main.consumerCount, 1, 'Se requiere un único consumidor QA en el vhost');
  console.log('INT-RABBIT: vhost QA aislado, colas vacías y consumidor activo');
});

after(async () => {
  try { if (channel) await channel.close(); } catch { /* tolerar cierre previo */ }
  try { if (conn) await conn.close(); } catch { /* tolerar cierre previo */ }
  try { if (producer) await producer.onModuleDestroy(); } catch { /* tolerar cierre previo */ }
  try { if (consumer) await consumer.onModuleDestroy(); } catch { /* tolerar cierre previo */ }
});

test('INT-RABBIT-01: productor SecureBank publica y consumidor recibe evento válido', async () => {
  assert.ok(producer && channel);
  eventLogs = [];
  const marker = randomUUID();
  await producer.publish(BANKING_EVENTS.TRANSFER_CREATED, { transferId: marker });
  await until(
    () => eventLogs.some((s) => s.includes('Evento recibido: TransferCreated')),
    5000,
    'Consumidor registró evento TransferCreated',
  );
  await until(async () => (await channel!.checkQueue(EVENT_QUEUE)).messageCount === 0, 3000, 'Cola principal vacía');
  console.log('PASS INT-RABBIT-01: evento de productor real recibido y procesado');
});

test('INT-RABBIT-02: sin consumidor el evento espera y se procesa al recuperarlo', async () => {
  assert.ok(consumer && producer && channel);
  await consumer.onModuleDestroy();
  consumer = undefined;
  await until(async () => (await channel!.checkQueue(EVENT_QUEUE)).consumerCount === 0, 3000, 'Cero consumidores');
  const marker = randomUUID();
  await producer.publish(BANKING_EVENTS.PAYMENT_CREATED, { paymentId: marker });
  await until(async () => (await channel!.checkQueue(EVENT_QUEUE)).messageCount === 1, 5000, 'Evento persiste sin consumidor');
  console.log('INFO INT-RABBIT-02: 1 evento retenido sin consumidor');
  consumer = new RabbitMQConsumer();
  eventLogs = [];
  attachEventLog(consumer);
  await consumer.onModuleInit();
  await until(
    () => eventLogs.some((s) => s.includes('Evento recibido: PaymentCreated')),
    5000,
    'Evento procesado tras reconexión',
  );
  await until(async () => (await channel!.checkQueue(EVENT_QUEUE)).messageCount === 0, 3000, 'Cola drenada');
  console.log('PASS INT-RABBIT-02: evento retenido y consumido tras recuperar el consumidor');
});

test('INT-RABBIT-03: mensaje inválido pasa por 3 reintentos y termina en DLQ', async () => {
  assert.ok(channel);
  const id = randomUUID();
  const baseline = await channel.checkQueue(DLQ);
  assert.equal(baseline.messageCount, 0, 'La DLQ debe iniciar vacía');
  channel.publish(EXCHANGE, 'QA.Invalid', Buffer.from(`no-es-json:${id}`), {
    persistent: true,
    contentType: 'application/json',
    messageId: id,
  });
  await channel.waitForConfirms();
  await until(async () => (await channel!.checkQueue(DLQ)).messageCount === 1, 35000, 'Mensaje rechazado en DLQ');

  const msg = await channel.get(DLQ, { noAck: false });
  assert.ok(msg, 'No se pudo inspeccionar el mensaje de la DLQ');
  try {
    assert.equal(msg.properties.messageId, id, 'ID de mensaje debe coincidir');
    assert.equal(Number(msg.properties.headers?.['x-retry-count']), 4,
      'Tres reintentos y un envío a DLQ deben producir x-retry-count=4');
    assert.equal(msg.fields.routingKey, 'QA.Invalid');
    console.log(`PASS INT-RABBIT-03: messageId=${id} x-retry-count=4 y DLQ confirmada`);
  } finally {
    // NO eliminamos el mensaje: se conserva disponible en la DLQ para las capturas.
    channel.nack(msg, false, true);
  }
});
