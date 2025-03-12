import {
  IsNotEmpty,
  IsString,
  IsArray,
  IsUUID,
  IsOptional,
  IsNumber,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SettleExpenseDto {
  @ApiProperty({ description: 'IDs delle quote di spesa da saldare' })
  @IsNotEmpty()
  @IsArray()
  @IsUUID('4', { each: true })
  share_ids: string[];
}

export class CreateSettlementDto {
  @ApiProperty({ description: "ID dell'utente che effettua il pagamento" })
  @IsNotEmpty()
  @IsString()
  from_user_id: string;

  @ApiProperty({ description: "ID dell'utente che riceve il pagamento" })
  @IsNotEmpty()
  @IsString()
  to_user_id: string;

  @ApiProperty({ description: 'Importo del pagamento' })
  @IsNotEmpty()
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({ description: 'Valuta', default: 'EUR' })
  @IsOptional()
  @IsString()
  currency?: string = 'EUR';

  @ApiProperty({ description: 'Note aggiuntive', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
