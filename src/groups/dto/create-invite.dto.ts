import { IsString, IsUUID, IsEmail } from 'class-validator';

export class CreateInviteDto {
  @IsUUID()
  group_id: string;

  @IsEmail()
  email: string;

  @IsString()
  role: 'admin' | 'member' | 'viewer';
}
