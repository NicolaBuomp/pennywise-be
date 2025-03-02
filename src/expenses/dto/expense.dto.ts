import {
  IsString,
  IsNumber,
  IsUUID,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ExpenseParticipantDto {
  @IsUUID()
  user_id: string;

  @IsNumber()
  share_amount: number;
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

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExpenseParticipantDto)
  participants: ExpenseParticipantDto[];
}
