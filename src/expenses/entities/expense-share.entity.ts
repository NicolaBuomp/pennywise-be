import { ApiProperty } from '@nestjs/swagger';

export class ExpenseShare {
  @ApiProperty()
  id: string;

  @ApiProperty()
  expense_id: string;

  @ApiProperty()
  user_id: string;

  @ApiProperty({ description: 'Importo da pagare' })
  amount: number;

  @ApiProperty({ description: 'Percentuale della spesa', required: false })
  percentage?: number;

  @ApiProperty({
    description: 'Indica se la quota è stata saldata',
    default: false,
  })
  is_settled: boolean;

  @ApiProperty({ description: 'Data in cui è stata saldata', required: false })
  settled_at?: Date;

  @ApiProperty({ description: 'Data di creazione' })
  created_at: Date;
}
