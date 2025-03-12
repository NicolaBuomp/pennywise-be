import {
  IsOptional,
  IsString,
  IsUUID,
  IsEnum,
  IsDate,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ExpenseFilterDto {
  @ApiProperty({
    required: false,
    description: 'ID della categoria della spesa',
  })
  @IsOptional()
  @IsUUID()
  category_id?: string;

  @ApiProperty({ required: false, description: "ID dell'utente pagatore" })
  @IsOptional()
  @IsString()
  paid_by?: string;

  @ApiProperty({
    required: false,
    description: 'Data di inizio (formato YYYY-MM-DD)',
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startDate?: Date;

  @ApiProperty({
    required: false,
    description: 'Data di fine (formato YYYY-MM-DD)',
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endDate?: Date;

  @ApiProperty({
    required: false,
    description: 'Ordinamento',
    enum: ['date', 'amount'],
    default: 'date',
  })
  @IsOptional()
  @IsEnum(['date', 'amount'])
  sortBy?: 'date' | 'amount' = 'date';

  @ApiProperty({
    required: false,
    description: 'Direzione ordinamento',
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortDir?: 'asc' | 'desc' = 'desc';

  @ApiProperty({ required: false, description: 'Numero di pagina', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiProperty({
    required: false,
    description: 'Elementi per pagina',
    default: 10,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  @Type(() => Number)
  limit?: number = 10;
}
