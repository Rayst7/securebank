import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CreatePaymentDto } from './dto/create-payment.dto.js';
import { PaymentsService } from './payments.service.js';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  findAll(@Req() req: any) {
    return this.paymentsService.findAll(req.user.userId);
  }

  @Get(':id')
  findOne(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.paymentsService.findOne(req.user.userId, id);
  }

  @Post()
  create(
    @Req() req: any,
    @Body() dto: CreatePaymentDto,
  ) {
    return this.paymentsService.create(req.user.userId, dto);
  }
}