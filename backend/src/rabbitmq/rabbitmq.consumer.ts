import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import {
  ConfirmChannel,
  ChannelModel,
  connect,
  ConsumeMessage,
} from 'amqplib';
import {
  BANKING_EVENTS,
  BankingEvent,
} from './rabbitmq.constants.js';

@Injectable()
export class RabbitMQConsumer
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(RabbitMQConsumer.name);

  private connection: ChannelModel | null = null;
  private channel: ConfirmChannel | null = null;

  private readonly exchange = 'securebank.events';
  private readonly queue = 'securebank.events.queue';
  private readonly retryExchange = 'securebank.retry';
  private readonly retryQueue = 'securebank.events.retry';
  private readonly deadLetterExchange = 'securebank.dlx';
  private readonly deadLetterQueue = 'securebank.events.dlq';

  async onModuleInit(): Promise<void> {
    const url = process.env.RABBITMQ_URL;

    if (!url) {
      throw new Error('Falta configurar RABBITMQ_URL');
    }

    this.connection = await connect(url);
    this.channel = await this.connection.createConfirmChannel();

    await this.channel.assertExchange(this.exchange, 'topic', {
      durable: true,
    });

    await this.channel.assertExchange(this.retryExchange, 'topic', {
      durable: true,
    });

    await this.channel.assertExchange(this.deadLetterExchange, 'topic', {
      durable: true,
    });

    await this.channel.assertQueue(this.queue, {
      durable: true,
    });

    await this.channel.assertQueue(this.retryQueue, {
      durable: true,
      arguments: {
        'x-message-ttl': 5000,
        'x-dead-letter-exchange': this.exchange,
      },
    });

    await this.channel.assertQueue(this.deadLetterQueue, {
      durable: true,
    });

    await this.channel.bindQueue(this.queue, this.exchange, '#');
    await this.channel.bindQueue(this.retryQueue, this.retryExchange, '#');
    await this.channel.bindQueue(
      this.deadLetterQueue,
      this.deadLetterExchange,
      '#',
    );

    await this.channel.prefetch(10);

    await this.channel.consume(
      this.queue,
      (message) => {
        if (message) {
          void this.handleMessage(message).catch((error: unknown) => {
            this.logger.error(
              'Error inesperado procesando el mensaje',
              error instanceof Error ? error.stack : String(error),
            );
          });
        }
      },
      { noAck: false },
    );

    this.logger.log('Consumidor RabbitMQ conectado');
  }

  private async handleMessage(message: ConsumeMessage): Promise<void> {
    const channel = this.channel;

    if (!channel) {
      return;
    }

    try {
      const content = JSON.parse(
        message.content.toString(),
      ) as {
        event?: string;
        occurredAt?: string;
        payload?: Record<string, unknown>;
      };

      const validEvents = Object.values(BANKING_EVENTS);

      if (
        !content.event ||
        !validEvents.includes(content.event as BankingEvent) ||
        !content.payload ||
        typeof content.payload !== 'object'
      ) {
        throw new Error('Formato de evento inválido');
      }

      this.logger.log(
        `Evento recibido: ${content.event}; mensaje: ${message.properties.messageId ?? 'sin ID'}`,
      );

      // Aquí se incorporará el procesamiento específico de cada evento.

      channel.ack(message);
    } catch (error) {
      const previousAttempts =
        Number(message.properties.headers?.['x-retry-count'] ?? 0);

      const nextAttempt = previousAttempts + 1;
      const routingKey = message.fields.routingKey;

      const destination =
        nextAttempt <= 3
          ? this.retryExchange
          : this.deadLetterExchange;

      const headers = {
        ...message.properties.headers,
        'x-retry-count': nextAttempt,
      };

      channel.publish(
        destination,
        routingKey,
        message.content,
        {
          persistent: true,
          contentType: message.properties.contentType,
          messageId: message.properties.messageId,
          headers,
        },
      );

      await channel.waitForConfirms();
      channel.ack(message);

      if (nextAttempt <= 3) {
        this.logger.warn(
          `Mensaje fallido; reintento ${nextAttempt}/3: ${routingKey}`,
        );
      } else {
        this.logger.error(
          `Mensaje enviado a la DLQ: ${routingKey}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.channel?.close();
    await this.connection?.close();
  }
}