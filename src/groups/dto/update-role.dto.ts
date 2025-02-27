import { IsString, IsUUID } from 'class-validator';

export class UpdateRoleDto {
  @IsUUID()
  group_id: string;

  @IsUUID()
  user_id: string;

  @IsString()
  role: 'admin' | 'member' | 'viewer';
}
