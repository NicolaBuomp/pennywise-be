import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CompleteProfileDto {
  @IsNotEmpty()
  @IsString()
  username: string;

  @IsNotEmpty()
  @IsString()
  first_name: string;

  @IsNotEmpty()
  @IsString()
  last_name: string;

  @IsOptional()
  @IsString()
  avatar_url?: string;

  @IsOptional()
  @IsString()
  phone_number?: string;
}
