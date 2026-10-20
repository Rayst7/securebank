import {
  Injectable,
  ConflictException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import { CreateBeneficiaryDto } from './dto/create-beneficiary.dto.js';

@Injectable()
export class BeneficiariesService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async findAll(userId: string) {
    return this.prisma.beneficiary.findMany({
      where: {
        userId,
      },
      select: {
        id: true,
        alias: true,
        accountNumber: true,
        bankName: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async create(
    userId: string,
    dto: CreateBeneficiaryDto,
  ) {
    const existing = await this.prisma.beneficiary.findFirst({
      where: {
        userId,
        accountNumber: dto.accountNumber,
        bankName: dto.bankName,
      },
      select: {
        id: true,
      },
    });

    if (existing) {
      throw new ConflictException(
        'Este beneficiario ya está registrado',
      );
    }

    return this.prisma.beneficiary.create({
      data: {
        alias: dto.alias.trim(),
        accountNumber: dto.accountNumber.trim(),
        bankName: dto.bankName.trim(),
        userId,
      },
      select: {
        id: true,
        alias: true,
        accountNumber: true,
        bankName: true,
        createdAt: true,
      },
    });
  }
}
