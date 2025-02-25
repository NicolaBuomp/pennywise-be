import { CreateExpenseDto } from './create-expense.dto';
import { PartialType } from '@nestjs/mapped-types';

export class UpdateExpenseDto extends PartialType(CreateExpenseDto) {}
