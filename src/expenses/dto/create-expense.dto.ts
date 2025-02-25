import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsArray,
} from 'class-validator';

export class CreateExpenseDto {
  @IsString()
  @IsNotEmpty()
  readonly description: string;

  @IsNumber()
  readonly amount: number;

  // Id del gruppo a cui appartiene la spesa
  @IsString()
  @IsNotEmpty()
  readonly groupId: string;

  // Modalità di divisione: "equal" oppure "specific"
  @IsString()
  @IsNotEmpty()
  readonly divisionType: string;

  // Se divisione specifica, array di user IDs (opzionale)
  @IsOptional()
  @IsArray()
  readonly assignedTo?: string[];
}
