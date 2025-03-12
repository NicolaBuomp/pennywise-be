import { Module } from '@nestjs/common';
import {
  GroupJoinRequestsController,
  UserJoinRequestsController,
} from './group-join-request.controller';
import { GroupJoinRequestsService } from './group-join-request.service';

@Module({
  controllers: [GroupJoinRequestsController, UserJoinRequestsController],
  providers: [GroupJoinRequestsService],
  exports: [GroupJoinRequestsService],
})
export class GroupJoinRequestsModule {}
