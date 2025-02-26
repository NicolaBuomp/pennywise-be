import {
  IsUUID,
  IsNumber,
  IsString,
  IsOptional,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateExpenseParticipantDto {
  @IsUUID()
  userId: string;

  @IsNumber()
  amount: number;
}

export class CreateExpenseDto {
  @IsUUID()
  groupId: string;

  @IsNumber()
  amount: number;

  @IsString()
  currency: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsUUID()
  paidBy: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsString()
  splitMethod: 'equal' | 'custom';

  @ValidateNested({ each: true })
  @Type(() => CreateExpenseParticipantDto)
  @ArrayMinSize(1)
  participants: CreateExpenseParticipantDto[];
}

export class SettleExpenseDto {
  @IsUUID()
  userId: string;
}
