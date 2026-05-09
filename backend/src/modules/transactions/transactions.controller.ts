import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { TransactionsService } from './transactions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { TransactionDto, ErrorResponseDto } from '../../common/swagger/response.models';

@ApiTags('Transactions')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactions: TransactionsService) {}

  @Get()
  @ApiOperation({ summary: 'Get transaction history', description: 'Returns all transactions for the authenticated user. Transaction data feeds the behavioral scoring engine.' })
  @ApiResponse({ status: 200, description: 'Transaction list', type: [TransactionDto] })
  @ApiResponse({ status: 401, description: 'Unauthorized', type: ErrorResponseDto })
  getMyTransactions(@CurrentUser('sub') userId: string) {
    return this.transactions.findByUser(userId);
  }
}
