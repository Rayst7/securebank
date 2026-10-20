import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { AccountsModule } from './accounts/accounts.module.js';
import { BeneficiariesModule } from './beneficiaries/beneficiaries.module.js';
import { TransfersModule } from './transfers/transfers.module.js';
import { PaymentsModule } from './payments/payments.module.js';
import { RedisModule } from './redis/redis.module.js';
import { RabbitMQModule } from './rabbitmq/rabbitmq.module.js';


@Module({
  imports: [
    PrismaModule,
    AuthModule,
    AccountsModule,
    BeneficiariesModule,
    TransfersModule,
    PaymentsModule,
    RedisModule,
    RabbitMQModule,
 
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}