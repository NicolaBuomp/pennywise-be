import { IsNotEmpty, IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateExpenseCategoryDto {
  @ApiProperty({ description: 'Nome della categoria' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Colore associato alla categoria',
    default: '#90caf9',
  })
  @IsOptional()
  @IsString()
  color?: string = '#90caf9';

  @ApiProperty({
    description: 'Icona associata alla categoria',
    required: false,
  })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiProperty({
    description: 'Indica se la categoria è globale (disponibile a tutti)',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  global?: boolean = false;
}

export class UpdateExpenseCategoryDto {
  @ApiProperty({ description: 'Nome della categoria', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description: 'Colore associato alla categoria',
    required: false,
  })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiProperty({
    description: 'Icona associata alla categoria',
    required: false,
  })
  @IsOptional()
  @IsString()
  icon?: string;
}
