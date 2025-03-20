import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CompleteProfileDto } from '../auth/dto/complete-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('users')
@UseGuards(SupabaseAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getProfile(@CurrentUser() user) {
    return this.usersService.getUserProfile(user.id);
  }

  @Get('profile-status')
  async checkProfileStatus(@CurrentUser() user) {
    const isComplete = await this.usersService.isProfileComplete(user.id);
    return { isComplete };
  }

  @Post('complete-profile')
  async completeProfile(
    @CurrentUser() user,
    @Body() profileDto: CompleteProfileDto,
  ) {
    return this.usersService.completeProfile(user.id, profileDto);
  }

  @Put('update-profile')
  async updateProfile(
    @CurrentUser() user,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(user.id, updateProfileDto);
  }

  @Delete('delete')
  async deleteOwnAccount(@CurrentUser() user) {
    return this.usersService.deleteUser(user.id);
  }

  // Endpoints per amministratore
  @Get('all')
  async getAllUsers() {
    return this.usersService.getAllUsers();
  }

  @Get(':id')
  async getUserById(@Param('id') id: string) {
    return this.usersService.getUserProfile(id);
  }

  @Delete(':id')
  async deleteUser(@Param('id') id: string) {
    return this.usersService.deleteUser(id);
  }
}
