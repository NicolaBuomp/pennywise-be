import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Req,
  Patch,
} from '@nestjs/common';
import { GroupsService } from './groups.service';
import { CreateInviteDto } from './dto/create-invite.dto';

@Controller('groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post()
  create(@Req() req, @Body() createGroupDto: { name: string }) {
    return this.groupsService.create(createGroupDto.name, req.user.id);
  }

  @Get()
  findAll(@Req() req) {
    return this.groupsService.findAll(req.user.id);
  }

  @Delete(':id')
  remove(@Req() req, @Param('id') id: string) {
    return this.groupsService.remove(id, req.user.id);
  }

  // 🔹 Aggiungere un membro al gruppo
  @Post(':groupId/members')
  addMember(
    @Req() req,
    @Param('groupId') groupId: string,
    @Body() body: { userId: string; role?: string },
  ) {
    return this.groupsService.addMember(
      groupId,
      body.userId,
      body.role || 'member',
      req.user.id,
    );
  }

  // 🔹 Rimuovere un membro dal gruppo
  @Delete(':groupId/members/:userId')
  removeMember(
    @Req() req,
    @Param('groupId') groupId: string,
    @Param('userId') userId: string,
  ) {
    return this.groupsService.removeMember(groupId, userId, req.user.id);
  }

  // 🔹 Recuperare tutti i membri di un gruppo
  @Get(':groupId/members')
  getMembers(@Req() req, @Param('groupId') groupId: string) {
    return this.groupsService.getMembers(groupId, req.user.id);
  }

  // 🔹 Modificare il ruolo di un membro
  @Patch(':groupId/members/:userId')
  updateRole(
    @Req() req,
    @Param('groupId') groupId: string,
    @Param('userId') userId: string,
    @Body() body: { role: string },
  ) {
    return this.groupsService.updateRole(
      groupId,
      userId,
      body.role,
      req.user.id,
    );
  }

  @Post(':groupId/invite')
  createInvite(@Req() req, @Body() createInviteDto: CreateInviteDto) {
    return this.groupsService.createInvite(req.user.id, createInviteDto);
  }

  @Post('invite/accept/:inviteId')
  acceptInvite(@Req() req, @Param('inviteId') inviteId: string) {
    return this.groupsService.acceptInvite(inviteId, req.user.id);
  }

  @Get('my-invites')
  getSentInvites(@Req() req) {
    return this.groupsService.getSentInvites(req.user.id);
  }

  @Post('clean-expired-invites')
  cleanExpiredInvites() {
    return this.groupsService.expireOldInvites();
  }
}
