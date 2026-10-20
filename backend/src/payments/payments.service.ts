import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreatePaymentDto } from './dto/create-payment.dto.js';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service.js';
import { BANKING_EVENTS } from '../rabbitmq/rabbitmq.constants.js';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rabbitMQ: RabbitMQService,
  ) {}

  async findAll(userId: string) {
    const payments = await this.prisma.payment.findMany({
      where: {
        account: {
          userId,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return payments.map((payment) => ({
      id: payment.id,
      serviceName: payment.serviceName,
      serviceReference: payment.serviceReference,
      amount: payment.amount.toFixed(2),
      currency: payment.currency,
      status: payment.status,
      accountId: payment.accountId,
      createdAt: payment.createdAt,
    }));
  }

  async findOne(userId: string, paymentId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: {
        id: paymentId,
        account: {
          userId,
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Pago no encontrado');
    }

    return {
      id: payment.id,
      serviceName: payment.serviceName,
      serviceReference: payment.serviceReference,
      amount: payment.amount.toFixed(2),
      currency: payment.currency,
      status: payment.status,
      accountId: payment.accountId,
      createdAt: payment.createdAt,
    };
  }

  async create(userId: string, dto: CreatePaymentDto) {
    const amount = new Prisma.Decimal(dto.amount);

    const account = await this.prisma.account.findUnique({
      where: {
        id: dto.accountId,
      },
    });

    if (!account) {
      throw new NotFoundException('La cuenta no existe');
    }

    if (account.userId !== userId) {
      throw new ForbiddenException(
        'No tienes permiso para operar con esta cuenta',
      );
    }

    if (account.status !== 'ACTIVE') {
      throw new BadRequestException(
        'La cuenta debe estar activa para realizar pagos',
      );
    }

    const existingPayment = await this.prisma.payment.findUnique({
      where: {
        accountId_idempotencyKey: {
          accountId: dto.accountId,
          idempotencyKey: dto.idempotencyKey,
        },
      },
    });

    if (existingPayment) {
      throw new ConflictException(
        'La clave de idempotencia ya fue utilizada',
      );
    }

    const committed = await this.prisma.$transaction(
      async (tx) => {
        const debit = await tx.account.updateMany({
          where: {
            id: dto.accountId,
            userId,
            status: 'ACTIVE',
            balance: {
              gte: amount,
            },
          },
          data: {
            balance: {
              decrement: amount,
            },
          },
        });

        if (debit.count !== 1) {
          throw new BadRequestException(
            'Saldo insuficiente o cuenta no disponible',
          );
        }

        const payment = await tx.payment.create({
          data: {
            accountId: account.id,
            idempotencyKey: dto.idempotencyKey,
            serviceName: dto.serviceName.trim(),
            serviceReference: dto.serviceReference.trim(),
            amount,
            currency: account.currency,
            status: 'COMPLETED',
          },
        });

        await tx.transaction.create({
          data: {
            accountId: account.id,
            paymentId: payment.id,
            type: 'PAYMENT',
            amount,
            currency: account.currency,
            description: `Pago de servicio: ${dto.serviceName.trim()}`,
          },
        });

        await tx.auditLog.create({
          data: {
            userId,
            action: 'PAYMENT_COMPLETED',
            entity: 'Payment',
            entityId: payment.id,
            details: {
              serviceName: payment.serviceName,
              serviceReference: payment.serviceReference,
              amount: amount.toFixed(2),
              currency: account.currency,
              accountId: account.id,
            },
          },
        });

        return {
          id: payment.id,
          reference: payment.reference,
          serviceName: payment.serviceName,
          serviceReference: payment.serviceReference,
          amount: payment.amount.toFixed(2),
          currency: payment.currency,
          status: payment.status,
          accountId: payment.accountId,
          createdAt: payment.createdAt,
        };
      },
    ).catch((error: unknown) => {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === 'P2002' || error.code === 'P2034')
      ) {
        throw new ConflictException(
          'La operación entró en conflicto. Verifica la clave de idempotencia e inténtalo nuevamente',
        );
      }

      throw error;
    });

    const { reference, ...result } = committed;

    // La transacción bancaria ya está confirmada.
    // Publicar el evento no debe provocar que el cliente repita
    // un pago que ya se completó.
    try {
      await this.rabbitMQ.publish(BANKING_EVENTS.PAYMENT_CREATED, {
        paymentId: result.id,
        reference,
        amount: result.amount,
        currency: result.currency,
        accountId: result.accountId,
        serviceName: result.serviceName,
        serviceReference: result.serviceReference,
      });
    } catch (error) {
      // No devolvemos un error que invite a repetir la operación:
      // el movimiento bancario ya se confirmó en PostgreSQL.
      console.error(
        'El pago se completó, pero falló la publicación en RabbitMQ',
        {
          paymentId: result.id,
          error: error instanceof Error ? error.message : String(error),
        },
      );
    }

    return result;
  }
}