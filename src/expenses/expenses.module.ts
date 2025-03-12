import { Module } from '@nestjs/common';
import {
  ExpensesController,
  ExpenseSharesController,
  UserExpensesController,
  BalancesController,
  ExpenseCategoriesController,
  SettlementsController,
} from './expenses.controller';
import { ExpensesService } from './expenses.service';
import { ExpenseSharesService } from './expense-shares.service';
import { BalanceService } from './balance.service';
import { ExpenseCategoryService } from './expense-category.service';

@Module({
  controllers: [
    ExpensesController,
    ExpenseSharesController,
    UserExpensesController,
    BalancesController,
    ExpenseCategoriesController,
    SettlementsController,
  ],
  providers: [
    ExpensesService,
    ExpenseSharesService,
    BalanceService,
    ExpenseCategoryService,
  ],
  exports: [
    ExpensesService,
    ExpenseSharesService,
    BalanceService,
    ExpenseCategoryService,
  ],
})
export class ExpensesModule {}
