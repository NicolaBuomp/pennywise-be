import { IsString, IsNotEmpty, IsIn } from 'class-validator';

export class UpdateRoleDto {
  @IsString()
  @IsNotEmpty()
  group_id: string;

  @IsString()
  @IsNotEmpty()
  user_id: string;

  @IsString()
  @IsIn(['admin', 'member'])
  role: 'admin' | 'member';
}
