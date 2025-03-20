import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decoretors';
import { SearchGroupsDto } from './dto/search-group.dto';

@ApiTags('groups')
@Controller('groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post()
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Crea un nuovo gruppo' })
  @ApiResponse({ status: 201, description: 'Gruppo creato con successo' })
  create(@Body() createGroupDto: CreateGroupDto, @CurrentUser() user: any) {
    return this.groupsService.create(createGroupDto, user.id);
  }

  @Get('search')
  @ApiOperation({ summary: 'Cerca gruppi pubblici' })
  @ApiResponse({
    status: 200,
    description: 'Restituisce i gruppi che corrispondono ai criteri di ricerca',
  })
  searchPublicGroups(@Query() searchGroupsDto: SearchGroupsDto) {
    return this.groupsService.searchPublicGroups(searchGroupsDto);
  }

  @Get()
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Ottieni tutti i gruppi dell'utente" })
  findAll(@CurrentUser() user: any) {
    return this.groupsService.findAllByUser(user.id);
  }

  @Get(':id')
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Ottieni dettagli di un gruppo specifico' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.groupsService.findOne(id, user.id);
  }

  @Patch(':id')
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Aggiorna un gruppo' })
  update(
    @Param('id') id: string,
    @Body() updateGroupDto: UpdateGroupDto,
    @CurrentUser() user: any,
  ) {
    return this.groupsService.update(id, updateGroupDto, user.id);
  }

  @Delete(':id')
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Elimina un gruppo' })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.groupsService.remove(id, user.id);
  }
}
