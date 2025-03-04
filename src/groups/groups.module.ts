import { Module } from '@nestjs/common';
import { GroupsService } from './groups.service';
import { GroupsController } from './groups.controller';
import { SupabaseModule } from '../supabase/supabase.module';
import { GroupMembersService } from './services/group-members.service';
import { GroupInvitesService } from './services/group-invites.service';
import { GroupJoinRequestsService } from './services/group-join-requests.service';

@Module({
  imports: [SupabaseModule],
  controllers: [GroupsController],
  providers: [
    GroupsService,
    GroupMembersService,
    GroupInvitesService,
    GroupJoinRequestsService,
  ],
  exports: [
    GroupsService,
    GroupMembersService,
    GroupInvitesService,
    GroupJoinRequestsService,
  ],
})
export class GroupsModule {}
