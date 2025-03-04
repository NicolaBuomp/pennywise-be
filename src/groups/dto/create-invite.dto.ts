import { IsNumber, IsOptional, Min, Max } from 'class-validator';

export class CreateInviteDto {
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(168) // Maximum 1 week (168 hours)
  expiresInHours?: number;
}
