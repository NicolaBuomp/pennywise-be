import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Request,
} from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/expense.dto';

@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  /**
   * API per creare una spesa e aggiornare i bilanci
   */
  @Post()
  async createExpense(
    @Request() req: { user: { id: string } },
    @Body() createExpenseDto: CreateExpenseDto,
  ) {
    return this.expensesService.createExpense(req.user.id, createExpenseDto);
  }

  /**
   * API per ottenere tutte le spese di un gruppo
   */
  @Get('/group/:groupId')
  async getExpensesByGroup(@Param('groupId') groupId: string) {
    return this.expensesService.getExpensesByGroup(groupId);
  }

  /**
   * API per recuperare il bilancio del gruppo
   */
  @Get('/balances/:groupId')
  async getGroupBalances(@Param('groupId') groupId: string) {
    return this.expensesService.getGroupBalances(groupId);
  }

  /**
   * API per saldare un debito tra utenti
   */
  @Put('/settle')
  async settleDebt(
    @Body()
    {
      group_id,
      payer_id,
      user_id,
      amount,
    }: {
      group_id: string;
      payer_id: string;
      user_id: string;
      amount: number;
    },
  ) {
    return this.expensesService.settleDebt(group_id, payer_id, user_id, amount);
  }

  @Get('/optimize/:groupId')
  async optimizePayments(@Param('groupId') groupId: string) {
    return this.expensesService.optimizePayments(groupId);
  }
}
