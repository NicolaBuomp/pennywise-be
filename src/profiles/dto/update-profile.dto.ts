// src/profiles/dto/update-profile.dto.ts
import { IsOptional, IsString, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiProperty({ required: false, description: "Nome dell'utente" })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiProperty({ required: false, description: "Cognome dell'utente" })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiProperty({
    required: false,
    description: "Nome visualizzato dell'utente",
  })
  @IsString()
  @IsOptional()
  displayName?: string;

  @ApiProperty({
    required: false,
    description: "Numero di telefono dell'utente",
  })
  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @ApiProperty({ required: false, description: "URL dell'avatar dell'utente" })
  @IsUrl()
  @IsOptional()
  avatarUrl?: string;

  @ApiProperty({
    required: false,
    description: "Lingua preferita dell'utente",
    default: 'it',
  })
  @IsString()
  @IsOptional()
  language?: string;

  @ApiProperty({
    required: false,
    description: "Valuta preferita dell'utente",
    default: 'EUR',
  })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiProperty({
    required: false,
    description: "Tema preferito dell'utente",
    default: 'light',
    enum: ['light', 'dark', 'system'],
  })
  @IsString()
  @IsOptional()
  theme?: string;
}