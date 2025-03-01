import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { GroupEntity } from './group.entity';

@Entity('group_invites')
export class GroupInviteEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => GroupEntity)
  group: GroupEntity;

  @Column({ type: 'uuid' })
  group_id: string;

  @Column({ unique: true })
  inviteToken: string;

  @Column({ type: 'timestamp with time zone' })
  expiresAt: Date;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
