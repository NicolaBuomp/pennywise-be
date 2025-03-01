import { IsString, IsBoolean, IsOptional } from 'class-validator';

export class UpdateGroupDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsBoolean()
  @IsOptional()
  requirePassword?: boolean;

  @IsString()
  @IsOptional()
  password?: string;
}
