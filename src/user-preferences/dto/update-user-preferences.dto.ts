import { IsString, IsOptional } from 'class-validator';

export class UpdateUserPreferencesDto {
  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  currency?: string;
}
