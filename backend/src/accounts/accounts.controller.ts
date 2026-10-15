import {
  Controller,
  Get,
  Req,
  UseGuards,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { AccountsService } from './accounts.service.js';

interface AuthenticatedRequest {
  user: {
    userId: string;
    email: string;
    role: 'CUSTOMER' | 'ADMIN';
  };
}

@Controller('accounts')
@UseGuards(JwtAuthGuard)
export class AccountsController {
  constructor(
    private readonly accountsService: AccountsService,
  ) {}

  // GET /api/accounts
  @Get()
  async findMyAccounts(@Req() req: AuthenticatedRequest) {
    return this.accountsService.findMyAccounts(
      req.user.userId,
    );
  }

  // GET /api/accounts/:id/transactions
  @Get(':id/transactions')
  async findAccountTransactions(
    @Req() req: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) accountId: string,
  ) {
    return this.accountsService.findAccountTransactions(
      req.user.userId,
      accountId,
    );
  }
}