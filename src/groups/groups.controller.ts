import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Request,
  NotFoundException,
  Delete,
} from '@nestjs/common';
import { GroupDetails, GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { CreateInviteDto } from './dto/create-invite.dto';
import { GroupMembersService } from './services/group-members.service';
import { GroupInvitesService } from './services/group-invites.service';
import { GroupJoinRequestsService } from './services/group-join-requests.service';
import { UpdateGroupDto } from './dto/update-group.dto';

@Controller('groups')
export class GroupsController {
  constructor(
    private readonly groupsService: GroupsService,
    private readonly groupMembersService: GroupMembersService,
    private readonly groupInvitesService: GroupInvitesService,
    private readonly groupJoinRequestsService: GroupJoinRequestsService,
  ) {}

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

  @Patch(':groupId')
  async updateGroup(
    @Param('groupId') groupId: string,
    @Body() updateGroupDto: UpdateGroupDto,
    @Request() req,
  ) {
    return this.groupsService.updateGroup(groupId, updateGroupDto, req.user.id);
  }

  @Post('search-by-tag')
  async searchGroupByTag(@Body() body: { tag: string }) {
    const group = await this.groupsService.searchGroupByTag(body.tag);

    if (!group) {
      throw new NotFoundException(
        `Nessun gruppo trovato con il TAG: ${body.tag}`,
      );
    }

    return group;
  }

  @Post(':groupId/invite')
  async createInvite(
    @Param('groupId') groupId: string,
    @Body() dto: CreateInviteDto,
    @Request() req,
  ) {
    return this.groupInvitesService.createInvite(groupId, dto);
  }

  @Post('join-by-token/:inviteToken')
  async joinGroup(@Param('inviteToken') inviteToken: string, @Request() req) {
    return this.groupsService.joinGroup(inviteToken, req.user.id);
  }

  @Patch('update-role')
  async updateUserRole(@Body() dto: UpdateRoleDto) {
    return this.groupMembersService.updateUserRole(dto);
  }

  @Post(':groupId/remove-user/:userId')
  async removeUser(
    @Param('groupId') groupId: string,
    @Param('userId') userId: string,
    @Request() req,
  ) {
    return this.groupMembersService.removeUser(groupId, userId, req.user.id);
  }

  @Post('join-by-id/:groupId')
  async createJoinRequest(
    @Param('groupId') groupId: string,
    @Body() body: { password?: string },
    @Request() req,
  ) {
    return this.groupJoinRequestsService.createJoinRequest(
      groupId,
      req.user.id,
      body.password,
    );
  }

  @Get(':groupId/join-requests')
  async getJoinRequests(@Param('groupId') groupId: string, @Request() req) {
    return this.groupJoinRequestsService.getJoinRequests(groupId, req.user.id);
  }

  @Patch(':groupId/join-requests/:requestId')
  async updateJoinRequestStatus(
    @Param('requestId') requestId: string,
    @Body() body: { status: 'approved' | 'denied' },
    @Request() req,
  ) {
    return this.groupJoinRequestsService.updateJoinRequestStatus(
      requestId,
      body.status,
      req.user.id,
    );
  }

  @Delete('delete/:groupId')
  async deleteGroup(@Param('groupId') groupId: string, @Request() req: any) {
    return this.groupsService.deleteGroup(groupId, req.user.id);
  }
}
