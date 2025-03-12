import { ApiProperty } from '@nestjs/swagger';

export class Expense {
  @ApiProperty()
  id: string;

  @ApiProperty()
  group_id: string;

  @ApiProperty({ description: 'ID di chi ha pagato la spesa' })
  paid_by: string;

  @ApiProperty({ description: 'Descrizione della spesa' })
  description: string;

  @ApiProperty({ description: 'Importo totale della spesa' })
  amount: number;

  @ApiProperty({ description: 'Valuta della spesa', default: 'EUR' })
  currency: string;

  @ApiProperty({
    description: 'ID della categoria della spesa',
    required: false,
  })
  category_id: string;

  @ApiProperty({ description: 'Data della spesa' })
  date: Date;

  @ApiProperty({
    description: 'ID della spesa ricorrente (se applicabile)',
    required: false,
  })
  recurring_expense_id?: string;

  @ApiProperty({ description: 'URL della ricevuta/scontrino', required: false })
  receipt_url?: string;

  @ApiProperty({ description: 'Note aggiuntive', required: false })
  notes?: string;

  @ApiProperty({ description: 'Data di creazione' })
  created_at: Date;

  @ApiProperty({ description: 'Data di aggiornamento' })
  updated_at: Date;
}
