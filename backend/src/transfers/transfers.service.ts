import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';

import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateTransferDto } from './dto/create-transfer.dto.js';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service.js';
import { BANKING_EVENTS } from '../rabbitmq/rabbitmq.constants.js';

@Injectable()
export class TransfersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rabbitMQ: RabbitMQService,
  ) {}

  async findAll(userId: string) {
    const transfers = await this.prisma.transfer.findMany({
      where: {
        OR: [
          {
            sourceAccount: {
              userId,
            },
          },
          {
            destinationAccount: {
              userId,
            },
          },
        ],
      },
      include: {
        sourceAccount: {
          select: {
            accountNumber: true,
          },
        },
        destinationAccount: {
          select: {
            accountNumber: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return transfers.map((transfer) => ({
      id: transfer.id,
      reference: transfer.reference,
      amount: transfer.amount.toFixed(2),
      currency: transfer.currency,
      status: transfer.status,
      description: transfer.description,
      sourceAccount: transfer.sourceAccount.accountNumber,
      destinationAccount: transfer.destinationAccount.accountNumber,
      createdAt: transfer.createdAt,
    }));
  }

  async create(userId: string, dto: CreateTransferDto) {
    const amount = new Prisma.Decimal(dto.amount);

    if (dto.sourceAccountId === dto.destinationAccountId) {
      throw new BadRequestException(
        'La cuenta de origen y destino deben ser diferentes',
      );
    }

    const sourceAccount = await this.prisma.account.findUnique({
      where: {
        id: dto.sourceAccountId,
      },
    });

    if (!sourceAccount) {
      throw new NotFoundException('La cuenta de origen no existe');
    }

    if (sourceAccount.userId !== userId) {
      throw new ForbiddenException(
        'No tienes permiso para operar con la cuenta de origen',
      );
    }

    const destinationAccount = await this.prisma.account.findUnique({
      where: {
        id: dto.destinationAccountId,
      },
    });

    if (!destinationAccount) {
      throw new NotFoundException('La cuenta de destino no existe');
    }

    if (
      sourceAccount.status !== 'ACTIVE' ||
      destinationAccount.status !== 'ACTIVE'
    ) {
      throw new BadRequestException(
        'Ambas cuentas deben estar activas',
      );
    }

    if (sourceAccount.currency !== destinationAccount.currency) {
      throw new BadRequestException(
        'Las cuentas deben utilizar la misma moneda',
      );
    }

    const existingTransfer = await this.prisma.transfer.findUnique({
      where: {
        sourceAccountId_idempotencyKey: {
          sourceAccountId: dto.sourceAccountId,
          idempotencyKey: dto.idempotencyKey,
        },
      },
    });

    if (existingTransfer) {
      throw new ConflictException(
        'La clave de idempotencia ya fue utilizada',
      );
    }

    let result: {
      id: string;
      reference: string;
      amount: string;
      currency: string;
      status: string;
      description: string | null;
      createdAt: Date;
    };

    try {
      result = await this.prisma.$transaction(
        async (tx) => {
          // Descontar el saldo únicamente si continúa siendo suficiente.
          const debit = await tx.account.updateMany({
            where: {
              id: dto.sourceAccountId,
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
              'Saldo insuficiente o cuenta de origen no disponible',
            );
          }

          // Acreditar el importe a la cuenta de destino.
          const credit = await tx.account.updateMany({
            where: {
              id: dto.destinationAccountId,
              status: 'ACTIVE',
              currency: sourceAccount.currency,
            },
            data: {
              balance: {
                increment: amount,
              },
            },
          });

          if (credit.count !== 1) {
            throw new BadRequestException(
              'La cuenta de destino no está disponible',
            );
          }

          const transfer = await tx.transfer.create({
            data: {
              sourceAccountId: dto.sourceAccountId,
              destinationAccountId: dto.destinationAccountId,
              amount,
              currency: sourceAccount.currency,
              status: 'COMPLETED',
              idempotencyKey: dto.idempotencyKey,
              description: dto.description?.trim() || null,
            },
          });

          // Registrar ambos movimientos contables.
          await tx.transaction.createMany({
            data: [
              {
                accountId: dto.sourceAccountId,
                transferId: transfer.id,
                type: 'TRANSFER_OUT',
                amount,
                currency: sourceAccount.currency,
                description: 'Transferencia enviada',
              },
              {
                accountId: dto.destinationAccountId,
                transferId: transfer.id,
                type: 'TRANSFER_IN',
                amount,
                currency: sourceAccount.currency,
                description: 'Transferencia recibida',
              },
            ],
          });

          // Registrar la auditoría dentro de la misma transacción.
          await tx.auditLog.create({
            data: {
              userId,
              action: 'TRANSFER_COMPLETED',
              entity: 'Transfer',
              entityId: transfer.id,
              details: {
                reference: transfer.reference,
                amount: amount.toFixed(2),
                currency: sourceAccount.currency,
                sourceAccountId: dto.sourceAccountId,
                destinationAccountId: dto.destinationAccountId,
              },
            },
          });

          return {
            id: transfer.id,
            reference: transfer.reference,
            amount: transfer.amount.toFixed(2),
            currency: transfer.currency,
            status: transfer.status,
            description: transfer.description,
            createdAt: transfer.createdAt,
          };
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === 'P2002' || error.code === 'P2034')
      ) {
        throw new ConflictException(
          'La operación entró en conflicto. Verifica la clave de idempotencia e inténtalo nuevamente',
        );
      }

      throw error;
    }

    // La transacción bancaria ya está confirmada.
    // Publicar los eventos no debe provocar que el cliente repita
    // una transferencia que ya se completó.
    try {
      await this.rabbitMQ.publish(BANKING_EVENTS.TRANSFER_CREATED, {
        transferId: result.id,
        reference: result.reference,
        amount: result.amount,
        currency: result.currency,
      });

      await this.rabbitMQ.publish(BANKING_EVENTS.TRANSFER_COMPLETED, {
        transferId: result.id,
        reference: result.reference,
        amount: result.amount,
        currency: result.currency,
        sourceAccountId: dto.sourceAccountId,
        destinationAccountId: dto.destinationAccountId,
      });
    } catch (error) {
      // No devolvemos un error que invite a repetir la operación:
      // el movimiento bancario ya se confirmó en PostgreSQL.
      console.error(
        'La transferencia se completó, pero falló la publicación en RabbitMQ',
        {
          transferId: result.id,
          error: error instanceof Error ? error.message : String(error),
        },
      );
    }

    return result;
  }
}