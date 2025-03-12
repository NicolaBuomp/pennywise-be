import { ApiProperty } from '@nestjs/swagger';

export class GroupMember {
  @ApiProperty()
  id: string;

  @ApiProperty()
  group_id: string;

  @ApiProperty()
  user_id: string;

  @ApiProperty({ enum: ['admin', 'member'], default: 'member' })
  role: string;

  @ApiProperty()
  joined_at: Date;
}
