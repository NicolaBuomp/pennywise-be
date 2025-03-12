import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { GroupJoinRequestsService } from './group-join-request.service';
import { CurrentUser } from '../../auth/decorators/current-user.decoretors';

@ApiTags('group-join-requests')
@Controller('groups/:groupId/join-requests')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class GroupJoinRequestsController {
  constructor(
    private readonly groupJoinRequestsService: GroupJoinRequestsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Richiedi di entrare in un gruppo' })
  @ApiResponse({ status: 201, description: 'Richiesta inviata con successo' })
  requestToJoin(
    @Param('groupId') groupId: string,
    @CurrentUser() user: any,
    @Body('message') message?: string,
  ) {
    return this.groupJoinRequestsService.requestToJoin(
      groupId,
      user.id,
      message,
    );
  }

  @Get()
  @ApiOperation({
    summary: 'Ottieni tutte le richieste di adesione per il gruppo',
  })
  getGroupJoinRequests(
    @Param('groupId') groupId: string,
    @CurrentUser() user: any,
  ) {
    return this.groupJoinRequestsService.getGroupJoinRequests(groupId, user.id);
  }

  @Patch(':requestId')
  @ApiOperation({ summary: 'Rispondi a una richiesta di adesione' })
  respondToJoinRequest(
    @Param('groupId') groupId: string,
    @Param('requestId') requestId: string,
    @CurrentUser() user: any,
    @Body('approved') approved: boolean,
  ) {
    return this.groupJoinRequestsService.respondToJoinRequest(
      requestId,
      user.id,
      approved,
    );
  }
}

@ApiTags('user-join-requests')
@Controller('user/join-requests')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UserJoinRequestsController {
  constructor(
    private readonly groupJoinRequestsService: GroupJoinRequestsService,
  ) {}

  @Get()
  @ApiOperation({
    summary: "Ottieni tutte le richieste di adesione dell'utente",
  })
  getUserJoinRequests(@CurrentUser() user: any) {
    return this.groupJoinRequestsService.getUserJoinRequests(user.id);
  }

  @Delete(':requestId')
  @ApiOperation({ summary: 'Cancella una richiesta di adesione' })
  cancelJoinRequest(
    @Param('requestId') requestId: string,
    @CurrentUser() user: any,
  ) {
    return this.groupJoinRequestsService.cancelJoinRequest(requestId, user.id);
  }
}
