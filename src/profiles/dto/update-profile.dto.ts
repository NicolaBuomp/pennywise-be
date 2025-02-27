import { IsString, IsOptional, IsUUID } from 'class-validator';

export class UpdateProfileDto {
  @IsUUID()
  id: string;

  @IsOptional()
  @IsString()
  first_name?: string;

  @IsOptional()
  @IsString()
  last_name?: string;

  @IsOptional()
  @IsString()
  full_name?: string; // Generato automaticamente da trigger

  @IsOptional()
  @IsString()
  phone_number?: string;

  @IsOptional()
  @IsString()
  language?: string = 'it';

  @IsOptional()
  @IsString()
  currency?: string = 'EUR';

  @IsOptional()
  @IsString()
  avatar_url?: string;
}
