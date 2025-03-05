import { IsString, IsOptional, IsUUID } from 'class-validator';

export class UserPreferencesDto {
  @IsUUID()
  id: string;

  @IsUUID()
  user_id: string;

  @IsOptional()
  @IsString()
  language?: string = 'it';

  @IsOptional()
  @IsString()
  currency?: string = 'EUR';
}
