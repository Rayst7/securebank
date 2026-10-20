import { Global, Module } from '@nestjs/common';
import { RabbitMQService } from './rabbitmq.service.js';
import { RabbitMQConsumer } from './rabbitmq.consumer.js';  

@Global()
@Module({
  providers: [RabbitMQService, RabbitMQConsumer],
  exports: [RabbitMQService],
})
export class RabbitMQModule {}