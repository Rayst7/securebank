import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { BeneficiariesService } from './beneficiaries.service.js';
import { CreateBeneficiaryDto } from './dto/create-beneficiary.dto.js';

interface AuthenticatedRequest {
  user: {
    userId: string;
    email: string;
    role: 'CUSTOMER' | 'ADMIN';
  };
}

@Controller('beneficiaries')
@UseGuards(JwtAuthGuard)
export class BeneficiariesController {
  constructor(
    private readonly beneficiariesService: BeneficiariesService,
  ) {}

  @Get()
  async findAll(@Req() req: AuthenticatedRequest) {
    return this.beneficiariesService.findAll(
      req.user.userId,
    );
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateBeneficiaryDto,
  ) {
    return this.beneficiariesService.create(
      req.user.userId,
      dto,
    );
  }
}
