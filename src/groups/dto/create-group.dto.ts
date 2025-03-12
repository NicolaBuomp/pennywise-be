import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateGroupDto {
  @ApiProperty({ description: 'Nome del gruppo' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ description: 'Descrizione del gruppo', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: "URL dell'avatar", required: false })
  @IsOptional()
  @IsString()
  avatar_url?: string;

  @ApiProperty({ description: 'Valuta predefinita', default: 'EUR' })
  @IsOptional()
  @IsString()
  default_currency?: string = 'EUR';

  @ApiProperty({
    description: 'Tipo di privacy',
    enum: ['public', 'private'],
    default: 'private',
  })
  @IsOptional()
  @IsEnum(['public', 'private'])
  privacy_type?: string = 'private';

  @ApiProperty({ description: 'Richiede password', default: false })
  @IsOptional()
  @IsBoolean()
  requires_password?: boolean = false;

  @ApiProperty({
    description: 'Password del gruppo (se richiesta)',
    required: false,
  })
  @IsOptional()
  @IsString()
  password?: string;
}
