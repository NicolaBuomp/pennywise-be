// src/profiles/profiles.controller.ts
import {
  Controller,
  Get,
  Put,
  Post,
  UploadedFile,
  UseInterceptors,
  Body,
  Req,
  Logger,
  HttpStatus,
  HttpCode,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ProfilesService } from './profiles.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ProfileDto } from './dto/profile.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Express } from 'express';

@ApiTags('profiles')
@ApiBearerAuth()
@Controller('profiles')
export class ProfilesController {
  private readonly logger = new Logger(ProfilesController.name);

  constructor(private readonly profilesService: ProfilesService) {}

  @Get()
  @ApiOperation({ summary: "Ottieni il profilo dell'utente corrente" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Profilo ottenuto con successo',
    type: ProfileDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Non autorizzato',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Profilo non trovato',
  })
  async getMyProfile(@Req() req): Promise<ProfileDto> {
    return this.profilesService.getProfile(req.user.id);
  }

  @Put()
  @ApiOperation({ summary: "Aggiorna il profilo dell'utente corrente" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Profilo aggiornato con successo',
    type: ProfileDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Non autorizzato',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Dati non validi',
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async updateProfile(
    @Req() req,
    @Body() updateProfileDto: UpdateProfileDto,
  ): Promise<ProfileDto> {
    return this.profilesService.updateProfile(req.user.id, updateProfileDto);
  }

  @Post('ensure')
  @ApiOperation({ summary: "Assicura che il profilo dell'utente esista" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Profilo assicurato con successo',
    type: ProfileDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Non autorizzato',
  })
  async ensureProfile(@Req() req): Promise<ProfileDto> {
    return this.profilesService.ensureProfileExists(req.user.id, req.user);
  }

  @Post('avatar')
  @ApiOperation({ summary: "Carica un avatar per l'utente" })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        avatar: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Avatar caricato con successo',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Non autorizzato',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'File non valido o troppo grande',
  })
  @UseInterceptors(FileInterceptor('avatar'))
  async uploadAvatar(@Req() req, @UploadedFile() file: Express.Multer.File) {
    if (!file) {
      return { error: 'Nessun file caricato' };
    }

    const fileExt = file.originalname
      ? file.originalname.split('.').pop()?.toLowerCase() || 'jpg'
      : 'jpg';

    const avatarUrl = await this.profilesService.uploadAvatar(
      req.user.id,
      file.buffer,
      fileExt,
    );

    return { avatarUrl };
  }

  @Post('last-active')
  @ApiOperation({ summary: "Aggiorna l'ultima attività dell'utente" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Ultima attività aggiornata con successo',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Non autorizzato',
  })
  @HttpCode(HttpStatus.OK)
  async updateLastActive(@Req() req) {
    await this.profilesService.updateLastActive(req.user.id);
    return { success: true };
  }
}
