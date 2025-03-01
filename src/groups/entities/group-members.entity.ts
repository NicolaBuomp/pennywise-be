import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { GroupEntity } from './group.entity';

@Entity('group_members')
export class GroupMemberEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => GroupEntity)
  group: GroupEntity;

  @Column({ type: 'uuid' })
  group_id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'text' })
  role: 'admin' | 'member';

  @CreateDateColumn()
  joinedAt: Date;
}
