import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CreateTransferDto } from './dto/create-transfer.dto.js';
import { TransfersService } from './transfers.service.js';

interface AuthenticatedRequest {
  user: {
    userId: string;
    email: string;
    role: 'CUSTOMER' | 'ADMIN';
  };
}

@Controller('transfers')
@UseGuards(JwtAuthGuard)
export class TransfersController {
  constructor(
    private readonly transfersService: TransfersService,
  ) {}

  @Get()
  async findAll(@Req() req: AuthenticatedRequest) {
    return this.transfersService.findAll(req.user.userId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateTransferDto,
  ) {
    return this.transfersService.create(req.user.userId, dto);
  }
}