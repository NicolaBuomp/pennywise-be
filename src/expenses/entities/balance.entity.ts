import { ApiProperty } from '@nestjs/swagger';

export class Balance {
  @ApiProperty()
  id: string;

  @ApiProperty()
  group_id: string;

  @ApiProperty({ description: "ID dell'utente debitore" })
  from_user_id: string;

  @ApiProperty({ description: "ID dell'utente creditore" })
  to_user_id: string;

  @ApiProperty({ description: 'Importo del debito' })
  amount: number;

  @ApiProperty({ description: 'Valuta', default: 'EUR' })
  currency: string;

  @ApiProperty({ description: 'Data ultimo aggiornamento' })
  updated_at: Date;
}
