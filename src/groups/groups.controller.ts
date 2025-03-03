import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Request,
  NotFoundException,
} from '@nestjs/common';
import { GroupDetails, GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { CreateInviteDto } from './dto/create-invite.dto';

@Controller('groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post()
  async createGroup(@Body() dto: CreateGroupDto, @Request() req) {
    return this.groupsService.createGroup(req.user.id, dto);
  }

  @Get('my')
  async getUserGroups(@Request() req) {
    return this.groupsService.getUserGroups(req.user.id);
  }

  @Get(':groupId')
  async getGroup(
    @Param('groupId') groupId: string,
    @Request() req,
  ): Promise<GroupDetails> {
    return this.groupsService.getGroupDetails(groupId, req.user.id);
  }

  @Get('tag/:tag')
  async searchGroupByTag(@Param('tag') tag: string) {
    const group = await this.groupsService.searchGroupByTag(tag);

    if (!group) {
      throw new NotFoundException(`Nessun gruppo trovato con il TAG: ${tag}`);
    }

    return group;
  }

  @Post(':groupId/invite')
  async createInvite(
    @Param('groupId') groupId: string,
    @Body() dto: CreateInviteDto,
    @Request() req,
  ) {
    return this.groupsService.createInvite(groupId, req.user.id, dto);
  }

  @Post('join-by-token/:inviteToken')
  async joinGroup(@Param('inviteToken') inviteToken: string, @Request() req) {
    return this.groupsService.joinGroup(inviteToken, req.user.id);
  }

  @Patch('update-role')
  async updateUserRole(@Body() dto: UpdateRoleDto) {
    return this.groupsService.updateUserRole(dto);
  }

  @Post(':groupId/remove-user/:userId')
  async removeUser(
    @Param('groupId') groupId: string,
    @Param('userId') userId: string,
    @Request() req,
  ) {
    return this.groupsService.removeUser(groupId, userId, req.user.id);
  }

  @Post('join-by-tag/:groupTag')
  async createJoinRequest(@Param('groupTag') groupTag: string, @Request() req) {
    console.log(groupTag);
    return this.groupsService.createJoinRequest(groupTag, req.user.id);
  }

  @Get(':groupId/join-requests')
  async getJoinRequests(@Param('groupId') groupId: string, @Request() req) {
    return this.groupsService.getJoinRequests(groupId, req.user.id);
  }

  @Patch(':groupId/join-requests/:requestId')
  async updateJoinRequestStatus(
    @Param('groupId') groupId: string,
    @Param('requestId') requestId: string,
    @Body() body: { status: 'approved' | 'denied' },
    @Request() req,
  ) {
    return this.groupsService.updateJoinRequestStatus(
      requestId,
      body.status,
      req.user.id,
    );
  }
}
