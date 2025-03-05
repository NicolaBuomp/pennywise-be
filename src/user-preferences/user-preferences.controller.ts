import { Controller, Get, Put, Body, Request, Inject } from '@nestjs/common';
import { UserPreferencesService } from './user-preferences.service';
import { UpdateUserPreferencesDto } from './dto/update-user-preferences.dto';

@Controller('user-preferences')
export class UserPreferencesController {
  constructor(
    @Inject(UserPreferencesService)
    private readonly userPreferencesService: UserPreferencesService,
  ) {}

  @Get('me')
  async getPreferences(@Request() req: { user: { id: string } }): Promise<any> {
    return await this.userPreferencesService.getPreferences(req.user.id);
  }

  @Put('me')
  async updatePreferences(
    @Request() req: { user: { id: string } },
    @Body() updateUserPreferencesDto: UpdateUserPreferencesDto,
  ): Promise<any> {
    return await this.userPreferencesService.updatePreferences(
      req.user.id,
      updateUserPreferencesDto,
    );
  }
}
