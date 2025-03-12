import { Module } from '@nestjs/common';
import {
  GroupInvitesController,
  InvitesController,
} from './group-invite.controller';
import { GroupInvitesService } from './group-invite.service';

@Module({
  controllers: [GroupInvitesController, InvitesController],
  providers: [GroupInvitesService],
  exports: [GroupInvitesService],
})
export class GroupInvitesModule {}
