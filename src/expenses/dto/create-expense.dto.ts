import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  IsUUID,
  IsEnum,
  IsDate,
  IsArray,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class ExpenseShareDto {
  @ApiProperty({ description: "ID dell'utente" })
  @IsNotEmpty()
  @IsString()
  user_id: string;

  @ApiProperty({ description: 'Importo da pagare', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @ApiProperty({ description: 'Percentuale della spesa', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  percentage?: number;
}

export class CreateExpenseDto {
  @ApiProperty({ description: 'Descrizione della spesa' })
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiProperty({ description: 'Importo totale della spesa' })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ description: 'Valuta', default: 'EUR' })
  @IsOptional()
  @IsString()
  currency?: string = 'EUR';

  @ApiProperty({ description: 'Data della spesa', type: Date })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  date?: Date = new Date();

  @ApiProperty({ description: "ID dell'utente che ha pagato la spesa" })
  @IsNotEmpty()
  @IsString()
  paid_by: string;

  @ApiProperty({
    description: 'ID della categoria della spesa',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  category_id?: string;

  @ApiProperty({ description: 'URL della ricevuta/scontrino', required: false })
  @IsOptional()
  @IsString()
  receipt_url?: string;

  @ApiProperty({ description: 'Note aggiuntive', required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({
    description: 'ID della spesa ricorrente (se applicabile)',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  recurring_expense_id?: string;

  @ApiProperty({
    description: 'Tipo di suddivisione',
    enum: ['equal', 'percentage', 'custom'],
    default: 'equal',
  })
  @IsOptional()
  @IsEnum(['equal', 'percentage', 'custom'])
  split_type?: 'equal' | 'percentage' | 'custom' = 'equal';

  @ApiProperty({
    description: 'Suddivisione della spesa tra gli utenti',
    type: [ExpenseShareDto],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExpenseShareDto)
  participants?: ExpenseShareDto[];
}
