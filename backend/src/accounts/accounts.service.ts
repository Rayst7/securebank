import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class AccountsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Obtiene las cuentas del usuario autenticado.
   */
  async findMyAccounts(userId: string) {
    const accounts = await this.prisma.account.findMany({
      where: {
        userId,
      },
      select: {
        id: true,
        accountNumber: true,
        balance: true,
        currency: true,
        status: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return accounts.map((account) => ({
      ...account,
      balance: account.balance.toFixed(2),
    }));
  }

  /**
   * Obtiene las transacciones de una cuenta propia.
   */
  async findAccountTransactions(
    userId: string,
    accountId: string,
  ) {
    const account = await this.prisma.account.findFirst({
      where: {
        id: accountId,
        userId,
      },
      select: {
        id: true,
      },
    });

    if (!account) {
      throw new NotFoundException(
        'La cuenta no existe o no tienes autorización para consultarla',
      );
    }

    const transactions = await this.prisma.transaction.findMany({
      where: {
        accountId: account.id,
      },
      select: {
        id: true,
        type: true,
        amount: true,
        currency: true,
        description: true,
        transferId: true,
        paymentId: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return transactions.map((transaction) => ({
      ...transaction,
      amount: transaction.amount.toFixed(2),
    }));
  }
}