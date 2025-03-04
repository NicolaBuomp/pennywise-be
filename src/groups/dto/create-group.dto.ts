import {
  IsString,
  IsOptional,
  IsBoolean,
  ValidateIf,
  IsNotEmpty,
} from 'class-validator';

export class CreateGroupDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsBoolean()
  @IsOptional()
  requirePassword?: boolean;

  @ValidateIf((o) => o.requirePassword === true)
  @IsString()
  @IsNotEmpty()
  password?: string;
}
