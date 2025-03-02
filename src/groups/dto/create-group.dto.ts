import { IsString, IsBoolean, IsOptional, IsNotEmpty } from 'class-validator';

export class CreateGroupDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsBoolean()
  @IsOptional()
  requirePassword?: boolean;

  @IsString()
  @IsOptional()
  password?: string;
}
