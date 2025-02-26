// groups/dto/update-role.dto.ts
import { IsString, IsIn } from 'class-validator';

export class UpdateRoleDto {
  @IsString()
  @IsIn(['admin', 'member', 'viewer'])
  role: string;
}
