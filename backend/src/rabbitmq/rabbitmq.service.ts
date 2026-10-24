import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  Channel,
  ChannelModel,
  connect,
  Options,
} from 'amqplib';
import { BANKING_EVENTS, BankingEvent } from './rabbitmq.constants.js';

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private connection: ChannelModel | null = null;
  private channel: Channel | null = null;

  async onModuleInit(): Promise<void> {
    const url = process.env.RABBITMQ_URL ?? 'amqp://securebank:CHANGE_ME@localhost:5672';

    this.connection = await connect(url);
    this.channel = await this.connection.createChannel();

    await this.channel.assertExchange('securebank.events', 'topic', {
      durable: true,
    });

    console.log('RabbitMQ conectado correctamente');
  }

  async publish(
    event: BankingEvent,
    payload: Record<string, unknown>,
  ): Promise<void> {
    if (!this.channel) {
      throw new ServiceUnavailableException(
        'RabbitMQ no está disponible',
      );
    }

    const message = {
      event,
      occurredAt: new Date().toISOString(),
      payload,
    };

    const published = this.channel.publish(
      'securebank.events',
      event,
      Buffer.from(JSON.stringify(message)),
      {
        persistent: true,
        contentType: 'application/json',
        messageId: crypto.randomUUID(),
      } as Options.Publish,
    );

    if (!published) {
      throw new ServiceUnavailableException(
        'RabbitMQ no aceptó el mensaje para publicación',
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.channel?.close();
    await this.connection?.close();
  }
}