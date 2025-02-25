import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';

export class CreateItemDto {
  @IsString()
  @IsNotEmpty()
  readonly name: string;

  @IsOptional()
  @IsString()
  readonly description?: string;

  @IsNumber()
  readonly quantity: number;

  // Id del gruppo a cui appartiene l’elemento
  @IsString()
  @IsNotEmpty()
  readonly groupId: string;
}
