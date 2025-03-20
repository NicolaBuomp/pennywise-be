import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { GroupInvitesService } from './group-invite.service';
import { SupabaseAuthGuard } from '../../auth/guards/supabase-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decoretors';

@ApiTags('group-invites')
@Controller('groups/:groupId/invites')
@UseGuards(SupabaseAuthGuard)
@ApiBearerAuth()
export class GroupInvitesController {
  constructor(private readonly groupInvitesService: GroupInvitesService) {}

  @Post()
  @ApiOperation({ summary: 'Crea un nuovo invito per il gruppo' })
  @ApiResponse({ status: 201, description: 'Invito creato con successo' })
  createInvite(
    @Param('groupId') groupId: string,
    @CurrentUser() user: any,
    @Query('expiresInDays') expiresInDays?: number,
    @Query('maxUses') maxUses?: number,
  ) {
    return this.groupInvitesService.createInvite(
      groupId,
      user.id,
      expiresInDays || 7,
      maxUses || 1,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Ottieni tutti gli inviti attivi per il gruppo' })
  getGroupInvites(@Param('groupId') groupId: string, @CurrentUser() user: any) {
    return this.groupInvitesService.getGroupInvites(groupId, user.id);
  }

  @Delete(':inviteId')
  @ApiOperation({ summary: 'Revoca un invito al gruppo' })
  revokeInvite(
    @Param('groupId') groupId: string,
    @Param('inviteId') inviteId: string,
    @CurrentUser() user: any,
  ) {
    return this.groupInvitesService.revokeInvite(inviteId, user.id);
  }
}

@ApiTags('invites')
@Controller('invites')
export class InvitesController {
  constructor(private readonly groupInvitesService: GroupInvitesService) {}

  @Post(':token/join')
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unisciti a un gruppo tramite invito' })
  useInvite(@Param('token') token: string, @CurrentUser() user: any) {
    return this.groupInvitesService.useInvite(token, user.id);
  }
}
