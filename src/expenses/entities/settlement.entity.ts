import { ApiProperty } from '@nestjs/swagger';

export class Settlement {
  @ApiProperty()
  id: string;

  @ApiProperty({ description: 'ID del gruppo' })
  group_id: string;

  @ApiProperty({ description: "ID dell'utente che ha effettuato il pagamento" })
  from_user_id: string;

  @ApiProperty({ description: "ID dell'utente che ha ricevuto il pagamento" })
  to_user_id: string;

  @ApiProperty({ description: 'Importo del pagamento' })
  amount: number;

  @ApiProperty({ description: 'Valuta', default: 'EUR' })
  currency: string;

  @ApiProperty({ description: 'Data del pagamento' })
  date: Date;

  @ApiProperty({ description: 'Note aggiuntive', required: false })
  notes?: string;

  @ApiProperty({ description: 'Data di creazione' })
  created_at: Date;
}
