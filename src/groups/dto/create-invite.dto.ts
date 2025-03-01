import { IsNumber, IsOptional, Min } from 'class-validator';

export class CreateInviteDto {
  @IsNumber()
  @IsOptional()
  @Min(1)
  expiresInHours?: number = 24;
}
