import { ApiProperty } from '@nestjs/swagger';

export class ExpenseCategory {
  @ApiProperty()
  id: string;

  @ApiProperty({ description: 'Nome della categoria' })
  name: string;

  @ApiProperty({
    description: 'Colore associato alla categoria',
    default: '#90caf9',
  })
  color: string;

  @ApiProperty({
    description: 'Icona associata alla categoria',
    required: false,
  })
  icon?: string;

  @ApiProperty({
    description: 'ID del gruppo a cui appartiene la categoria (se non globale)',
    required: false,
  })
  group_id?: string;

  @ApiProperty({
    description: 'Indica se la categoria è globale (disponibile a tutti)',
    default: false,
  })
  global: boolean;

  @ApiProperty({ description: 'Data di creazione' })
  created_at: Date;
}
