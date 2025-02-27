import { IsString, IsNotEmpty, IsOptional, IsInt, Min, IsUUID, IsBoolean } from 'class-validator';

export class CreateItemDto {
  @IsUUID()
  @IsNotEmpty()
  readonly shopping_list_id: string;

  @IsString()
  @IsNotEmpty()
  readonly name: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  readonly quantity?: number = 1;
}

export class UpdateItemDto {
  @IsString()
  @IsOptional()
  readonly name?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  readonly quantity?: number;

  @IsBoolean()
  @IsOptional()
  readonly completed?: boolean;
}