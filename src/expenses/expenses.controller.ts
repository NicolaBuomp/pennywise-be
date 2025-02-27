import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Request,
} from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto, SettleExpenseDto } from './dto/expense.dto';

@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  async createExpense(
    @Request() req: { user: { id: string } },
    @Body() createExpenseDto: CreateExpenseDto,
  ) {
    return this.expensesService.createExpense(req.user.id, createExpenseDto);
  }

  @Get('group/:groupId')
  async getExpensesByGroup(@Param('groupId') groupId: string) {
    return this.expensesService.getExpensesByGroup(groupId);
  }

  @Get(':expenseId')
  async getExpenseById(@Param('expenseId') expenseId: string) {
    return this.expensesService.getExpenseById(expenseId);
  }

  @Put(':expenseId')
  async updateExpense(
    @Param('expenseId') expenseId: string,
    @Body() updateData: Partial<CreateExpenseDto>,
  ) {
    return this.expensesService.updateExpense(expenseId, updateData);
  }

  @Delete(':expenseId/:groupId')
  async deleteExpense(
    @Param('expenseId') expenseId: string,
    @Param('groupId') groupId: string,
  ) {
    return this.expensesService.deleteExpense(expenseId, groupId);
  }

  @Post('settle')
  async settleExpense(@Body() settleExpenseDto: SettleExpenseDto) {
    return this.expensesService.settleExpense(settleExpenseDto);
  }

  @Get(':expenseId/participants')
  async getExpenseParticipants(@Param('expenseId') expenseId: string) {
    return this.expensesService.getExpenseParticipants(expenseId);
  }

  @Get('group/:groupId/balance')
  async getGroupBalances(@Param('groupId') groupId: string) {
    return this.expensesService.recalculateBalances(groupId);
  }
}
