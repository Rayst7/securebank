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
import { CreateTransferDto } from './dto/create-transfer.dto.js';
import { TransfersService } from './transfers.service.js';

const sourceAccount = {
  id: 'source-account',
  userId: 'user-1',
  status: 'ACTIVE',
  currency: 'GTQ',
};

const destinationAccount = {
  id: 'destination-account',
  userId: 'user-2',
  status: 'ACTIVE',
  currency: 'GTQ',
};

function makeDto(overrides: Partial<CreateTransferDto> = {}): CreateTransferDto {
  return {
    sourceAccountId: sourceAccount.id,
    destinationAccountId: destinationAccount.id,
    amount: 100.5,
    idempotencyKey: 'idem-key-1',
    description: 'Pago de prueba',
    ...overrides,
  };
}

const baseDto = makeDto();

function createHarness() {
  const tx = {
    account: { updateMany: jest.fn() },
    transfer: { create: jest.fn() },
    transaction: { createMany: jest.fn() },
    auditLog: { create: jest.fn() },
  };

  const prisma = {
    account: { findUnique: jest.fn() },
    transfer: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  };

  const rabbitMQ = { publish: jest.fn() };

  prisma.$transaction.mockImplementation(
    async (callback: (client: typeof tx) => unknown) => callback(tx),
  );

  const service = new TransfersService(
    prisma as unknown as PrismaService,
    rabbitMQ as unknown as RabbitMQService,
  );

  return { service, prisma, tx, rabbitMQ };
}

function setAccountsResolved(
  prisma: ReturnType<typeof createHarness>['prisma'],
  source: typeof sourceAccount = sourceAccount,
  destination: { id: string; userId: string; status: string; currency: string } | null = destinationAccount,
) {
  prisma.account.findUnique
    .mockResolvedValueOnce(source)
    .mockResolvedValueOnce(destination);
}

function setSuccessfulTransaction(tx: ReturnType<typeof createHarness>['tx']) {
  tx.account.updateMany
    .mockResolvedValueOnce({ count: 1 })
    .mockResolvedValueOnce({ count: 1 });

  tx.transfer.create.mockResolvedValue({
    id: 'transfer-1',
    reference: 'reference-1',
    amount: new Prisma.Decimal('100.50'),
    currency: 'GTQ',
    status: 'COMPLETED',
    description: 'Pago de prueba',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  });

  tx.transaction.createMany.mockResolvedValue({ count: 2 });
  tx.auditLog.create.mockResolvedValue({ id: 'audit-1' });
}

describe('TransfersService', () => {
  let harness: ReturnType<typeof createHarness>;

  beforeEach(() => {
    harness = createHarness();
    harness.prisma.transfer.findUnique.mockResolvedValue(null);
  });

  describe('create - validaciones', () => {
    it('rechaza cuando la cuenta de origen y destino son iguales', async () => {
      const dto = makeDto({ destinationAccountId: baseDto.sourceAccountId });

      await expect(harness.service.create('user-1', dto)).rejects.toBeInstanceOf(
        BadRequestException,
      );

      expect(harness.prisma.account.findUnique).not.toHaveBeenCalled();
      expect(harness.prisma.$transaction).not.toHaveBeenCalled();
    });

    it('rechaza cuando la cuenta de origen no existe', async () => {
      harness.prisma.account.findUnique.mockResolvedValue(null);

      await expect(
        harness.service.create('user-1', baseDto),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(harness.prisma.$transaction).not.toHaveBeenCalled();
    });

    it('rechaza cuando el usuario no es propietario de la cuenta de origen', async () => {
      harness.prisma.account.findUnique.mockResolvedValue({
        ...sourceAccount,
        userId: 'otro-usuario',
      });

      await expect(
        harness.service.create('user-1', baseDto),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rechaza cuando la cuenta de destino no existe', async () => {
      setAccountsResolved(harness.prisma, sourceAccount, null);

      await expect(
        harness.service.create('user-1', baseDto),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rechaza cuando alguna cuenta no está activa', async () => {
      harness.prisma.account.findUnique
        .mockResolvedValueOnce({ ...sourceAccount, status: 'BLOCKED' })
        .mockResolvedValueOnce(destinationAccount);

      await expect(
        harness.service.create('user-1', baseDto),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rechaza cuando las monedas no coinciden', async () => {
      setAccountsResolved(harness.prisma, sourceAccount, {
        ...destinationAccount,
        currency: 'USD',
      });

      await expect(
        harness.service.create('user-1', baseDto),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('create - idempotencia', () => {
    it('rechaza una clave de idempotencia ya utilizada sin ejecutar la transacción', async () => {
      setAccountsResolved(harness.prisma);
      harness.prisma.transfer.findUnique.mockResolvedValue({
        id: 'transfer-existente',
      });

      await expect(
        harness.service.create('user-1', baseDto),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(harness.prisma.transfer.findUnique).toHaveBeenCalledWith({
        where: {
          sourceAccountId_idempotencyKey: {
            sourceAccountId: baseDto.sourceAccountId,
            idempotencyKey: baseDto.idempotencyKey,
          },
        },
      });
      expect(harness.prisma.$transaction).not.toHaveBeenCalled();
      expect(harness.rabbitMQ.publish).not.toHaveBeenCalled();
    });
  });

  describe('create - transacción exitosa', () => {
    it('descuenta, acredita, registra movimientos y devuelve la transferencia', async () => {
      setAccountsResolved(harness.prisma);
      setSuccessfulTransaction(harness.tx);

      const result = await harness.service.create('user-1', baseDto);

      expect(result).toEqual({
        id: 'transfer-1',
        reference: 'reference-1',
        amount: '100.50',
        currency: 'GTQ',
        status: 'COMPLETED',
        description: 'Pago de prueba',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      });

      expect(harness.tx.account.updateMany).toHaveBeenCalledTimes(2);
      expect(harness.tx.transfer.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          sourceAccountId: sourceAccount.id,
          destinationAccountId: destinationAccount.id,
          status: 'COMPLETED',
          idempotencyKey: baseDto.idempotencyKey,
        }),
      });
      expect(harness.tx.transaction.createMany).toHaveBeenCalledTimes(1);
      expect(harness.tx.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'TRANSFER_COMPLETED',
          entity: 'Transfer',
          entityId: 'transfer-1',
        }),
      });
    });

    it('publica TRANSFER_CREATED y TRANSFER_COMPLETED después del commit', async () => {
      setAccountsResolved(harness.prisma);
      setSuccessfulTransaction(harness.tx);

      await harness.service.create('user-1', baseDto);

      expect(harness.rabbitMQ.publish).toHaveBeenCalledTimes(2);
      expect(harness.rabbitMQ.publish).toHaveBeenNthCalledWith(
        1,
        BANKING_EVENTS.TRANSFER_CREATED,
        expect.objectContaining({
          transferId: 'transfer-1',
          reference: 'reference-1',
          amount: '100.50',
          currency: 'GTQ',
        }),
      );
      expect(harness.rabbitMQ.publish).toHaveBeenNthCalledWith(
        2,
        BANKING_EVENTS.TRANSFER_COMPLETED,
        expect.objectContaining({
          transferId: 'transfer-1',
          sourceAccountId: sourceAccount.id,
          destinationAccountId: destinationAccount.id,
        }),
      );
    });
  });

  describe('create - errores de concurrencia y saldo', () => {
    it('rechaza cuando el débito condicional no afecta ninguna cuenta', async () => {
      setAccountsResolved(harness.prisma);
      harness.tx.account.updateMany.mockResolvedValueOnce({ count: 0 });

      await expect(
        harness.service.create('user-1', baseDto),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(harness.rabbitMQ.publish).not.toHaveBeenCalled();
    });

    it('traduce un conflicto de unicidad de Prisma (P2002) en ConflictException', async () => {
      setAccountsResolved(harness.prisma);
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

    it('no publica eventos si la transacción bancaria falla', async () => {
      setAccountsResolved(harness.prisma);
      harness.prisma.$transaction.mockRejectedValue(
        new Error('fallo de base de datos'),
      );

      await expect(
        harness.service.create('user-1', baseDto),
      ).rejects.toThrow('fallo de base de datos');

      expect(harness.rabbitMQ.publish).not.toHaveBeenCalled();
    });
  });

  describe('create - fallo de RabbitMQ posterior al commit', () => {
    it('devuelve la transferencia completada aunque falle la publicación', async () => {
      setAccountsResolved(harness.prisma);
      setSuccessfulTransaction(harness.tx);
      harness.rabbitMQ.publish.mockRejectedValue(new Error('RabbitMQ caído'));
      const consoleError = jest
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);

      const result = await harness.service.create('user-1', baseDto);

      expect(result.id).toBe('transfer-1');
      expect(consoleError).toHaveBeenCalled();

      consoleError.mockRestore();
    });
  });
});
