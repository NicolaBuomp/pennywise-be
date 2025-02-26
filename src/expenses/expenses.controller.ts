import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  HttpStatus,
  HttpCode,
  ValidationPipe,
  UsePipes,
} from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CreateExpenseDto, SettleExpenseDto } from './dto/expense.dto';

@ApiTags('expenses')
@ApiBearerAuth()
@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crea una nuova spesa' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Spesa creata con successo',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Accesso negato' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async create(@Req() req, @Body() createExpenseDto: CreateExpenseDto) {
    try {
      return await this.expensesService.create(createExpenseDto, req.user.id);
    } catch (error) {
      console.error(`Errore nella creazione della spesa: ${error.message}`);
      throw error;
    }
  }

  @Get('balances/:groupId')
  @ApiOperation({ summary: 'Ottiene i bilanci per un gruppo' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Bilanci ottenuti con successo',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Accesso negato' })
  async getBalances(@Req() req, @Param('groupId') groupId: string) {
    return this.expensesService.getBalances(groupId, req.user.id);
  }

  @Get(':groupId')
  @ApiOperation({ summary: 'Ottiene tutte le spese per un gruppo' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Spese ottenute con successo',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Accesso negato' })
  async findAll(@Req() req, @Param('groupId') groupId: string) {
    return this.expensesService.findAll(groupId, req.user.id);
  }

  @Patch(':expenseId/settle')
  @ApiOperation({ summary: 'Segna una spesa come saldata' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Spesa saldata con successo',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Accesso negato' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async settleExpense(
    @Req() req,
    @Param('expenseId') expenseId: string,
    @Body() settleExpenseDto: SettleExpenseDto,
  ) {
    return this.expensesService.settleExpense(
      expenseId,
      settleExpenseDto.userId,
      req.user.id,
    );
  }

  @Delete(':expenseId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Elimina una spesa' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Spesa eliminata con successo',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Accesso negato' })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Spesa non trovata',
  })
  async remove(@Req() req, @Param('expenseId') expenseId: string) {
    try {
      await this.expensesService.remove(expenseId, req.user.id);
      return;
    } catch (error) {
      console.error(`Errore nell'eliminazione della spesa: ${error.message}`);
      throw error;
    }
  }

  @Get('balances/net/:groupId')
  @ApiOperation({ summary: 'Ottiene i bilanci netti per un gruppo' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Bilanci netti ottenuti con successo',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Accesso negato' })
  async getNetBalances(@Req() req, @Param('groupId') groupId: string) {
    return this.expensesService.getNetBalances(groupId, req.user.id);
  }

  @Post('simplify/:groupId')
  @ApiOperation({ summary: 'Semplifica i bilanci di un gruppo' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Bilanci semplificati con successo',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Accesso negato' })
  simplifyBalances(@Param('groupId') groupId: string) {
    return this.expensesService.simplifyBalances(groupId);
  }
}
