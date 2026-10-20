import { jest } from '@jest/globals';
import type { ConsumeMessage } from 'amqplib';

import { RabbitMQConsumer } from './rabbitmq.consumer.js';

interface ConsumerInternals {
  handleMessage(message: ConsumeMessage): Promise<void>;
}

const EXCHANGE_EVENTS = 'securebank.events';
const RETRY_EXCHANGE = 'securebank.retry';
const DEAD_LETTER_EXCHANGE = 'securebank.dlx';

function buildMessage(
  content: string,
  options: {
    headers?: Record<string, unknown>;
    routingKey?: string;
    messageId?: string;
  } = {},
): ConsumeMessage {
  return {
    content: Buffer.from(content),
    fields: { routingKey: options.routingKey ?? 'TransferCreated' },
    properties: {
      headers: options.headers ?? {},
      messageId: options.messageId ?? 'message-1',
      contentType: 'application/json',
    },
  } as unknown as ConsumeMessage;
}

function buildValidEvent(event = 'TransferCreated'): string {
  return JSON.stringify({
    event,
    occurredAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
    payload: { transferId: 'transfer-1' },
  });
}

function createChannelMock() {
  return {
    ack: jest.fn(),
    publish: jest.fn(),
    waitForConfirms: jest.fn().mockResolvedValue(undefined),
  };
}

function setupConsumer() {
  const consumer = new RabbitMQConsumer();
  const channel = createChannelMock();
  Object.assign(consumer, { channel });
  const internals = consumer as unknown as ConsumerInternals;
  return { consumer, channel, internals };
}

describe('RabbitMQConsumer', () => {
  describe('validación de eventos', () => {
    it('confirma un evento válido sin reencolarlo', async () => {
      const { channel, internals } = setupConsumer();

      await internals.handleMessage(
        buildMessage(buildValidEvent('TransferCreated')),
      );

      expect(channel.ack).toHaveBeenCalledTimes(1);
      expect(channel.publish).not.toHaveBeenCalled();
    });

    it('confirma un evento PAYMENT_CREATED válido', async () => {
      const { channel, internals } = setupConsumer();

      await internals.handleMessage(
        buildMessage(buildValidEvent('PaymentCreated'), {
          routingKey: 'PaymentCreated',
        }),
      );

      expect(channel.ack).toHaveBeenCalledTimes(1);
      expect(channel.publish).not.toHaveBeenCalled();
    });

    it('reintenta cuando el cuerpo no es JSON válido', async () => {
      const { channel, internals } = setupConsumer();

      await internals.handleMessage(buildMessage('no-es-json'));

      expect(channel.publish).toHaveBeenCalledTimes(1);
      const [exchange, , , options] = channel.publish.mock.calls[0];
      expect(exchange).toBe(RETRY_EXCHANGE);
      expect(options.headers['x-retry-count']).toBe(1);
      await expect(channel.waitForConfirms()).resolves.toBeUndefined();
      expect(channel.ack).toHaveBeenCalledTimes(1);
    });

    it('reintenta cuando el evento no está en la lista permitida', async () => {
      const { channel, internals } = setupConsumer();

      await internals.handleMessage(
        buildMessage(buildValidEvent('EventoDesconocido')),
      );

      expect(channel.publish).toHaveBeenCalledTimes(1);
      expect(channel.publish.mock.calls[0][0]).toBe(RETRY_EXCHANGE);
      expect(channel.ack).toHaveBeenCalledTimes(1);
    });

    it('reintenta cuando falta el payload', async () => {
      const { channel, internals } = setupConsumer();

      await internals.handleMessage(
        buildMessage(JSON.stringify({ event: 'TransferCreated' })),
      );

      expect(channel.publish).toHaveBeenCalledTimes(1);
      expect(channel.publish.mock.calls[0][0]).toBe(RETRY_EXCHANGE);
      expect(channel.ack).toHaveBeenCalledTimes(1);
    });

    it('no falla si el canal no está inicializado', async () => {
      const consumer = new RabbitMQConsumer();
      const internals = consumer as unknown as ConsumerInternals;

      await expect(
        internals.handleMessage(buildMessage(buildValidEvent())),
      ).resolves.toBeUndefined();
    });
  });

  describe('reintentos', () => {
    it('incrementa x-retry-count al reencolar un mensaje inválido', async () => {
      const { channel, internals } = setupConsumer();

      await internals.handleMessage(
        buildMessage('no-es-json', { headers: { 'x-retry-count': 2 } }),
      );

      const [exchange, , , options] = channel.publish.mock.calls[0];
      expect(exchange).toBe(RETRY_EXCHANGE);
      expect(options.headers['x-retry-count']).toBe(3);
      expect(options.persistent).toBe(true);
      expect(channel.ack).toHaveBeenCalledTimes(1);
    });

    it('reencola al exchange de reintentos mientras no se agoten los intentos', async () => {
      const { channel, internals } = setupConsumer();

      await internals.handleMessage(buildMessage('no-es-json'));

      const [exchange, routingKey, content, options] =
        channel.publish.mock.calls[0];
      expect(exchange).toBe(RETRY_EXCHANGE);
      expect(routingKey).toBe('TransferCreated');
      expect(Buffer.isBuffer(content)).toBe(true);
      expect(options.headers['x-retry-count']).toBe(1);
    });
  });

  describe('DLQ tras agotar los intentos', () => {
    it('envía a la DLQ cuando ya se realizaron tres reintentos', async () => {
      const { channel, internals } = setupConsumer();

      await internals.handleMessage(
        buildMessage('no-es-json', { headers: { 'x-retry-count': 3 } }),
      );

      const [exchange, routingKey, , options] = channel.publish.mock.calls[0];
      expect(exchange).toBe(DEAD_LETTER_EXCHANGE);
      expect(routingKey).toBe('TransferCreated');
      expect(options.headers['x-retry-count']).toBe(4);
      expect(channel.ack).toHaveBeenCalledTimes(1);
    });

    it('no publica en el exchange de eventos original al fallar', async () => {
      const { channel, internals } = setupConsumer();

      await internals.handleMessage(
        buildMessage('no-es-json', { headers: { 'x-retry-count': 3 } }),
      );

      expect(channel.publish).not.toHaveBeenCalledWith(
        EXCHANGE_EVENTS,
        expect.anything(),
        expect.anything(),
        expect.anything(),
      );
    });
  });
});
