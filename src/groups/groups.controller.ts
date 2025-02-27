import { Controller, Get, Post, Put, Delete, Body, Param, Request } from '@nestjs/common';
import { GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { CreateInviteDto } from './dto/create-invite.dto';

@Controller('groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post()
  async createGroup(@Request() req: { user: { id: string } }, @Body() createGroupDto: CreateGroupDto) {
    return this.groupsService.createGroup(req.user.id, createGroupDto);
  }

  @Get()
  async getUserGroups(@Request() req: { user: { id: string } }) {
    return this.groupsService.getUserGroups(req.user.id);
  }

  @Get(':groupId/invites')
  async getGroupInvites(@Param('groupId') groupId: string) {
    return this.groupsService.getGroupInvites(groupId);
  }

  @Put(':groupId')
  async updateGroup(@Param('groupId') groupId: string, @Body() updateGroupDto: UpdateGroupDto) {
    return this.groupsService.updateGroup(groupId, updateGroupDto);
  }

  @Delete(':groupId')
  async deleteGroup(@Param('groupId') groupId: string) {
    return this.groupsService.deleteGroup(groupId);
  }

  @Post('invite')
  async inviteUserToGroup(@Body() createInviteDto: CreateInviteDto) {
    return this.groupsService.inviteUserToGroup(createInviteDto);
  }

  @Post('join/:inviteToken')
  async joinGroupWithToken(@Request() req: { user: { id: string } }, @Param('inviteToken') inviteToken: string) {
    return this.groupsService.joinGroupWithToken(inviteToken, req.user.id);
  }

  @Put('role')
  async updateUserRole(@Body() updateRoleDto: UpdateRoleDto) {
    return this.groupsService.updateUserRole(updateRoleDto);
  }

  @Delete(':groupId/members/:userId')
  async deleteGroupMember(
    @Request() req: { user: { id: string } },
    @Param('groupId') groupId: string,
    @Param('userId') userId: string
  ) {
    return this.groupsService.deleteGroupMember(groupId, userId, req.user.id);
  }

  @Delete('invite/:inviteId')
  async deleteGroupInvite(@Param('inviteId') inviteId: string) {
    return this.groupsService.deleteGroupInvite(inviteId);
  }
}
