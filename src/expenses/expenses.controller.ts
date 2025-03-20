import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { ExpensesService } from './expenses.service';
import { ExpenseSharesService } from './expense-shares.service';
import { BalanceService } from './balance.service';
import { ExpenseCategoryService } from './expense-category.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import {
  SettleExpenseDto,
  CreateSettlementDto,
} from './dto/settle-expense.dto';
import { ExpenseFilterDto } from './dto/expense-filter.dto';
import {
  CreateExpenseCategoryDto,
  UpdateExpenseCategoryDto,
} from './dto/create-expense-category.dto';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decoretors';

@ApiTags('expenses')
@Controller('groups/:groupId/expenses')
@UseGuards(SupabaseAuthGuard)
@ApiBearerAuth()
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  @ApiOperation({ summary: 'Crea una nuova spesa' })
  @ApiResponse({ status: 201, description: 'Spesa creata con successo' })
  create(
    @Param('groupId') groupId: string,
    @Body() createExpenseDto: CreateExpenseDto,
    @CurrentUser() user: any,
  ) {
    return this.expensesService.create(groupId, createExpenseDto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Ottieni tutte le spese del gruppo' })
  @ApiResponse({ status: 200, description: 'Elenco delle spese' })
  findAll(
    @Param('groupId') groupId: string,
    @Query() filterDto: ExpenseFilterDto,
    @CurrentUser() user: any,
  ) {
    return this.expensesService.findAll(groupId, user.id, filterDto);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Ottieni il riepilogo delle spese per categoria' })
  @ApiResponse({ status: 200, description: 'Riepilogo delle spese' })
  @ApiQuery({ name: 'startDate', required: false, type: Date })
  @ApiQuery({ name: 'endDate', required: false, type: Date })
  getExpenseSummary(
    @Param('groupId') groupId: string,
    @CurrentUser() user: any,
    @Query('startDate') startDate?: Date,
    @Query('endDate') endDate?: Date,
  ) {
    return this.expensesService.getExpenseSummary(
      groupId,
      user.id,
      startDate,
      endDate,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Ottieni i dettagli di una spesa' })
  @ApiResponse({ status: 200, description: 'Dettagli della spesa' })
  findOne(
    @Param('groupId') groupId: string,
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.expensesService.findOne(groupId, id, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Aggiorna una spesa' })
  @ApiResponse({ status: 200, description: 'Spesa aggiornata con successo' })
  update(
    @Param('groupId') groupId: string,
    @Param('id') id: string,
    @Body() updateExpenseDto: UpdateExpenseDto,
    @CurrentUser() user: any,
  ) {
    return this.expensesService.update(groupId, id, updateExpenseDto, user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Elimina una spesa' })
  @ApiResponse({ status: 200, description: 'Spesa eliminata con successo' })
  remove(
    @Param('groupId') groupId: string,
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.expensesService.remove(groupId, id, user.id);
  }
}

@ApiTags('expense-shares')
@Controller('groups/:groupId/expenses/:expenseId/shares')
@UseGuards(SupabaseAuthGuard)
@ApiBearerAuth()
export class ExpenseSharesController {
  constructor(private readonly expenseSharesService: ExpenseSharesService) {}

  @Post('settle')
  @ApiOperation({ summary: 'Segna una o più quote come saldate' })
  @ApiResponse({ status: 200, description: 'Quote saldate con successo' })
  settleShares(
    @Param('groupId') groupId: string,
    @Param('expenseId') expenseId: string,
    @Body() settleExpenseDto: SettleExpenseDto,
    @CurrentUser() user: any,
  ) {
    return this.expenseSharesService.settleShares(
      groupId,
      expenseId,
      settleExpenseDto,
      user.id,
    );
  }
}

@ApiTags('expense-categories')
@Controller('groups/:groupId/categories')
@UseGuards(SupabaseAuthGuard)
@ApiBearerAuth()
export class ExpenseCategoriesController {
  constructor(private readonly categoryService: ExpenseCategoryService) {}

  @Post()
  @ApiOperation({ summary: 'Crea una nuova categoria di spesa' })
  @ApiResponse({ status: 201, description: 'Categoria creata con successo' })
  create(
    @Param('groupId') groupId: string,
    @Body() createCategoryDto: CreateExpenseCategoryDto,
    @CurrentUser() user: any,
  ) {
    return this.categoryService.create(groupId, createCategoryDto, user.id);
  }

  @Get()
  @ApiOperation({
    summary: 'Ottieni tutte le categorie disponibili per il gruppo',
  })
  @ApiResponse({ status: 200, description: 'Elenco delle categorie' })
  findAll(@Param('groupId') groupId: string, @CurrentUser() user: any) {
    return this.categoryService.findAll(groupId, user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Ottieni i dettagli di una categoria' })
  @ApiResponse({ status: 200, description: 'Dettagli della categoria' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.categoryService.findOne(id, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Aggiorna una categoria' })
  @ApiResponse({
    status: 200,
    description: 'Categoria aggiornata con successo',
  })
  update(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateExpenseCategoryDto,
    @CurrentUser() user: any,
  ) {
    return this.categoryService.update(id, updateCategoryDto, user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Elimina una categoria' })
  @ApiResponse({ status: 200, description: 'Categoria eliminata con successo' })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.categoryService.remove(id, user.id);
  }
}

@ApiTags('user-expenses')
@Controller('user/expenses')
@UseGuards(SupabaseAuthGuard)
@ApiBearerAuth()
export class UserExpensesController {
  constructor(private readonly expenseSharesService: ExpenseSharesService) {}

  @Get('groups/:groupId/shares')
  @ApiOperation({ summary: "Ottieni tutte le quote dell'utente in un gruppo" })
  @ApiResponse({ status: 200, description: "Elenco delle quote dell'utente" })
  getUserSharesInGroup(
    @Param('groupId') groupId: string,
    @CurrentUser() user: any,
  ) {
    return this.expenseSharesService.getUserSharesInGroup(groupId, user.id);
  }

  @Get('groups/:groupId/summary')
  @ApiOperation({
    summary: "Ottieni il riepilogo spese dell'utente in un gruppo",
  })
  @ApiResponse({ status: 200, description: "Riepilogo spese dell'utente" })
  getUserExpenseSummary(
    @Param('groupId') groupId: string,
    @CurrentUser() user: any,
  ) {
    return this.expenseSharesService.getUserExpenseSummary(groupId, user.id);
  }
}

@ApiTags('balances')
@Controller('groups/:groupId/balances')
@UseGuards(SupabaseAuthGuard)
@ApiBearerAuth()
export class BalancesController {
  constructor(private readonly balanceService: BalanceService) {}

  @Get()
  @ApiOperation({ summary: 'Ottieni tutti i saldi del gruppo' })
  @ApiResponse({ status: 200, description: 'Elenco dei saldi del gruppo' })
  getGroupBalances(
    @Param('groupId') groupId: string,
    @CurrentUser() user: any,
  ) {
    return this.balanceService.getGroupBalances(groupId, user.id);
  }

  @Get('recalculate')
  @ApiOperation({ summary: 'Ricalcola i saldi del gruppo' })
  @ApiResponse({ status: 200, description: 'Saldi ricalcolati con successo' })
  recalculateGroupBalances(
    @Param('groupId') groupId: string,
    @CurrentUser() user: any,
  ) {
    return this.balanceService.recalculateGroupBalances(groupId);
  }

  @Get('user')
  @ApiOperation({ summary: "Ottieni i saldi dell'utente nel gruppo" })
  @ApiResponse({ status: 200, description: "Saldi dell'utente" })
  getUserBalanceInGroup(
    @Param('groupId') groupId: string,
    @CurrentUser() user: any,
  ) {
    return this.balanceService.getUserBalanceInGroup(groupId, user.id);
  }
}

@ApiTags('settlements')
@Controller('groups/:groupId/settlements')
@UseGuards(SupabaseAuthGuard)
@ApiBearerAuth()
export class SettlementsController {
  constructor(private readonly balanceService: BalanceService) {}

  @Post()
  @ApiOperation({ summary: 'Registra un nuovo pagamento' })
  @ApiResponse({
    status: 201,
    description: 'Pagamento registrato con successo',
  })
  createSettlement(
    @Param('groupId') groupId: string,
    @Body() createSettlementDto: CreateSettlementDto,
    @CurrentUser() user: any,
  ) {
    return this.balanceService.createSettlement(
      groupId,
      createSettlementDto,
      user.id,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Ottieni tutti i pagamenti del gruppo' })
  @ApiResponse({ status: 200, description: 'Elenco dei pagamenti' })
  getGroupSettlements(
    @Param('groupId') groupId: string,
    @CurrentUser() user: any,
  ) {
    return this.balanceService.getGroupSettlements(groupId, user.id);
  }

  @Get('user')
  @ApiOperation({ summary: "Ottieni i pagamenti dell'utente nel gruppo" })
  @ApiResponse({ status: 200, description: "Pagamenti dell'utente" })
  getUserSettlementsInGroup(
    @Param('groupId') groupId: string,
    @CurrentUser() user: any,
  ) {
    return this.balanceService.getUserSettlementsInGroup(groupId, user.id);
  }
}
