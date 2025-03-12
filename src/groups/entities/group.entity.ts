import { ApiProperty } from '@nestjs/swagger';

export class Group {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ required: false })
  description: string;

  @ApiProperty({ required: false })
  avatar_url: string;

  @ApiProperty({ default: 'EUR' })
  default_currency: string;

  @ApiProperty()
  group_identifier: string;

  @ApiProperty({ enum: ['public', 'private'], default: 'private' })
  privacy_type: string;

  @ApiProperty({ default: false })
  requires_password: boolean;

  @ApiProperty({ required: false })
  password: string;

  @ApiProperty()
  created_by: string;

  @ApiProperty({ default: 0 })
  member_count: number;

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  updated_at: Date;
}
