import {
  Controller,
  Get,
  Put,
  Body,
  Request,
  Post,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { ProfilesService } from './profiles.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { Express } from 'express';

@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Get('me')
  async getProfile(@Request() req: { user: { id: string } }): Promise<any> {
    return this.profilesService.getProfile(req.user.id);
  }

  @Put('me')
  async updateProfile(
    @Request() req: { user: { id: string } },
    @Body() updateProfileDto: UpdateProfileDto,
  ): Promise<any> {
    return this.profilesService.updateProfile(req.user.id, updateProfileDto);
  }

  @Post('me/avatar')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(
    @Request() req: { user: { id: string } },
    @UploadedFile() file: Express.Multer.File,
  ): Promise<{ avatarUrl: string }> {
    const avatarUrl = await this.profilesService.uploadAvatar(
      req.user.id,
      file.buffer,
      file.originalname,
    );
    return { avatarUrl };
  }
}
