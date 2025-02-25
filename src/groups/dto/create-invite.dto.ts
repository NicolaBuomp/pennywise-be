import { IsEmail, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class CreateInviteDto {
  @IsNotEmpty()
  @IsUUID()
  groupId: string;

  @IsNotEmpty()
  @IsEmail()
  inviteeEmail: string;

  @IsOptional()
  role?: 'admin' | 'member' | 'viewer' = 'member';
}
