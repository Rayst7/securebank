import { jest } from '@jest/globals';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service.js';
import { BANKING_EVENTS } from '../rabbitmq/rabbitmq.constants.js';
import { CreatePaymentDto } from './dto/create-payment.dto.js';
import { PaymentsService } from './payments.service.js';

const account = {
  id: 'account-1',
  userId: 'user-1',
  status: 'ACTIVE',
  currency: 'GTQ',
};

const baseDto: CreatePaymentDto = {
  accountId: account.id,
  idempotencyKey: 'payment-idem-1',
  serviceName: 'Empresa de Energía',
  serviceReference: 'REF-001',
  amount: 75.25,
};

function createHarness() {
  const tx = {
    account: { updateMany: jest.fn() },
    payment: { create: jest.fn() },
    transaction: { create: jest.fn() },
    auditLog: { create: jest.fn() },
  };

  const prisma = {
    account: { findUnique: jest.fn() },
    payment: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  };

  const rabbitMQ = { publish: jest.fn() };

  prisma.$transaction.mockImplementation(
    async (callback: (client: typeof tx) => unknown) => callback(tx),
  );

  const service = new PaymentsService(
    prisma as unknown as PrismaService,
    rabbitMQ as unknown as RabbitMQService,
  );

  return { service, prisma, tx, rabbitMQ };
}

function setSuccessfulTransaction(tx: ReturnType<typeof createHarness>['tx']) {
  tx.account.updateMany.mockResolvedValue({ count: 1 });

  tx.payment.create.mockResolvedValue({
    id: 'payment-1',
    reference: 'payment-reference-1',
    serviceName: 'Empresa de Energía',
    serviceReference: 'REF-001',
    amount: new Prisma.Decimal('75.25'),
    currency: 'GTQ',
    status: 'COMPLETED',
    accountId: account.id,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  });

  tx.transaction.create.mockResolvedValue({ id: 'transaction-1' });
  tx.auditLog.create.mockResolvedValue({ id: 'audit-1' });
}

describe('PaymentsService', () => {
  let harness: ReturnType<typeof createHarness>;

  beforeEach(() => {
    harness = createHarness();
    harness.prisma.payment.findUnique.mockResolvedValue(null);
  });

  describe('create - validaciones', () => {
    it('rechaza cuando la cuenta no existe', async () => {
      harness.prisma.account.findUnique.mockResolvedValue(null);

      await expect(
        harness.service.create('user-1', baseDto),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(harness.prisma.$transaction).not.toHaveBeenCalled();
      expect(harness.rabbitMQ.publish).not.toHaveBeenCalled();
    });

    it('rechaza cuando el usuario no es propietario de la cuenta', async () => {
      harness.prisma.account.findUnique.mockResolvedValue({
        ...account,
        userId: 'otro-usuario',
      });

      await expect(
        harness.service.create('user-1', baseDto),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(harness.prisma.$transaction).not.toHaveBeenCalled();
    });

    it('rechaza cuando la cuenta no está activa', async () => {
      harness.prisma.account.findUnique.mockResolvedValue({
        ...account,
        status: 'BLOCKED',
      });

      await expect(
        harness.service.create('user-1', baseDto),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(harness.prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('create - débito condicional', () => {
    it('rechaza cuando el débito no afecta ninguna cuenta', async () => {
      harness.prisma.account.findUnique.mockResolvedValue(account);
      harness.tx.account.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        harness.service.create('user-1', baseDto),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(harness.tx.payment.create).not.toHaveBeenCalled();
      expect(harness.rabbitMQ.publish).not.toHaveBeenCalled();
    });
  });

  describe('create - transacción exitosa', () => {
    beforeEach(() => {
      harness.prisma.account.findUnique.mockResolvedValue(account);
      setSuccessfulTransaction(harness.tx);
    });

    it('crea el pago, el movimiento contable y la auditoría', async () => {
      const result = await harness.service.create('user-1', baseDto);

      expect(result).toEqual({
        id: 'payment-1',
        serviceName: 'Empresa de Energía',
        serviceReference: 'REF-001',
        amount: '75.25',
        currency: 'GTQ',
        status: 'COMPLETED',
        accountId: account.id,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      });

      expect(harness.tx.account.updateMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          id: account.id,
          userId: 'user-1',
          status: 'ACTIVE',
        }),
        data: { balance: { decrement: expect.anything() } },
      });
      expect(harness.tx.payment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          accountId: account.id,
          serviceName: 'Empresa de Energía',
          status: 'COMPLETED',
        }),
      });
      expect(harness.tx.transaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          accountId: account.id,
          paymentId: 'payment-1',
          type: 'PAYMENT',
        }),
      });
      expect(harness.tx.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'PAYMENT_COMPLETED',
          entity: 'Payment',
          entityId: 'payment-1',
        }),
      });
    });

    it('publica PAYMENT_CREATED después del commit', async () => {
      await harness.service.create('user-1', baseDto);

      expect(harness.rabbitMQ.publish).toHaveBeenCalledTimes(1);
      expect(harness.rabbitMQ.publish).toHaveBeenCalledWith(
        BANKING_EVENTS.PAYMENT_CREATED,
        {
          paymentId: 'payment-1',
          reference: 'payment-reference-1',
          amount: '75.25',
          currency: 'GTQ',
          accountId: account.id,
          serviceName: 'Empresa de Energía',
          serviceReference: 'REF-001',
        },
      );
    });
  });

  describe('create - manejo de errores', () => {
    it('no publica eventos si la transacción bancaria falla', async () => {
      harness.prisma.account.findUnique.mockResolvedValue(account);
      harness.prisma.$transaction.mockRejectedValue(
        new Error('fallo de base de datos'),
      );

      await expect(
        harness.service.create('user-1', baseDto),
      ).rejects.toThrow('fallo de base de datos');

      expect(harness.rabbitMQ.publish).not.toHaveBeenCalled();
    });

    it('devuelve el pago completado aunque falle la publicación en RabbitMQ', async () => {
      harness.prisma.account.findUnique.mockResolvedValue(account);
      setSuccessfulTransaction(harness.tx);
      harness.rabbitMQ.publish.mockRejectedValue(new Error('RabbitMQ caído'));
      const consoleError = jest
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);

      const result = await harness.service.create('user-1', baseDto);

      expect(result.id).toBe('payment-1');
      expect(consoleError).toHaveBeenCalled();

      consoleError.mockRestore();
    });
  });

  describe('create - idempotencia', () => {
    beforeEach(() => {
      harness.prisma.account.findUnique.mockResolvedValue(account);
    });

    it('permite una solicitud nueva y persiste la clave de idempotencia', async () => {
      harness.prisma.payment.findUnique.mockResolvedValue(null);
      setSuccessfulTransaction(harness.tx);

      await harness.service.create('user-1', baseDto);

      expect(harness.prisma.payment.findUnique).toHaveBeenCalledWith({
        where: {
          accountId_idempotencyKey: {
            accountId: account.id,
            idempotencyKey: baseDto.idempotencyKey,
          },
        },
      });
      expect(harness.tx.payment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          idempotencyKey: baseDto.idempotencyKey,
        }),
      });
      expect(harness.rabbitMQ.publish).toHaveBeenCalledTimes(1);
    });

    it('rechaza una solicitud duplicada sin ejecutar la transacción ni publicar', async () => {
      harness.prisma.payment.findUnique.mockResolvedValue({
        id: 'payment-existente',
      });

      await expect(
        harness.service.create('user-1', baseDto),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(harness.prisma.$transaction).not.toHaveBeenCalled();
      expect(harness.rabbitMQ.publish).not.toHaveBeenCalled();
    });

    it('traduce un conflicto de unicidad concurrente (P2002) en ConflictException', async () => {
      harness.prisma.payment.findUnique.mockResolvedValue(null);
      harness.prisma.$transaction.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Registro duplicado', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );

      await expect(
        harness.service.create('user-1', baseDto),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(harness.rabbitMQ.publish).not.toHaveBeenCalled();
    });

    it('propaga errores de transacción distintos de conflicto de unicidad', async () => {
      harness.prisma.payment.findUnique.mockResolvedValue(null);
      harness.prisma.$transaction.mockRejectedValue(
        new Error('Fallo inesperado de la transacción'),
      );

      await expect(
        harness.service.create('user-1', baseDto),
      ).rejects.toThrow('Fallo inesperado de la transacción');

      expect(harness.rabbitMQ.publish).not.toHaveBeenCalled();
    });
  });
});
