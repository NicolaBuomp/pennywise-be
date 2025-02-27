import { IsString, IsNumber, IsUUID, IsOptional } from 'class-validator';

export class ExpenseDto {
  @IsUUID()
  id: string;

  @IsUUID()
  group_id: string;

  @IsUUID()
  user_id: string;

  @IsString()
  description: string;

  @IsNumber()
  amount: number;

  @IsString()
  currency: string = 'EUR';

  @IsOptional()
  @IsString()
  created_at?: string;

  @IsOptional()
  @IsString()
  updated_at?: string;
}

export class CreateExpenseDto {
  @IsUUID()
  group_id: string;

  @IsString()
  description: string;

  @IsNumber()
  amount: number;

  @IsString()
  currency: string = 'EUR';
}

export class SettleExpenseDto {
  @IsUUID()
  expense_id: string;

  @IsUUID()
  payer_id: string;
}
