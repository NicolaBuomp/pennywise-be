// src/profiles/profiles.service.ts
import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ProfileDto } from './dto/profile.dto';

@Injectable()
export class ProfilesService {
  private readonly logger = new Logger(ProfilesService.name);

  constructor(private readonly supabase: SupabaseService) {}

  /**
   * Ottiene il profilo utente in base all'ID
   */
  async getProfile(userId: string): Promise<ProfileDto> {
    try {
      const { data, error } = await this.supabase
        .getClient()
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new NotFoundException(
            `Profilo per l'utente ${userId} non trovato`,
          );
        }
        throw error;
      }

      return this.mapToProfileDto(data);
    } catch (error) {
      this.logger.error(`Errore nel recupero del profilo: ${error.message}`);
      throw error;
    }
  }

  /**
   * Aggiorna il profilo utente
   */
  async updateProfile(
    userId: string,
    updateProfileDto: UpdateProfileDto,
  ): Promise<ProfileDto> {
    try {
      const profileData = this.mapToDbRecord(updateProfileDto);
      profileData.updated_at = new Date().toISOString();

      const { data, error } = await this.supabase
        .getClient()
        .from('profiles')
        .update(profileData)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return this.mapToProfileDto(data);
    } catch (error) {
      this.logger.error(
        `Errore nell'aggiornamento del profilo: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Assicura che il profilo utente esista, creandolo se necessario
   */
  async ensureProfileExists(
    userId: string,
    userData: any,
  ): Promise<ProfileDto> {
    try {
      // Verifica se il profilo esiste già
      const { data, error } = await this.supabase
        .getClient()
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (!error && data) {
        // Il profilo esiste già, lo ritorniamo
        return this.mapToProfileDto(data);
      }

      // Se il profilo non esiste, lo creiamo
      const metadata = userData?.user_metadata || {};
      const email = userData?.email || '';

      const displayName =
        metadata.full_name ||
        `${metadata.name || ''} ${metadata.surname || ''}`.trim() ||
        email.split('@')[0] ||
        'Utente';

      const newProfile = {
        id: userId,
        name: metadata.name || '',
        surname: metadata.surname || '',
        display_name: displayName,
        phone_number: metadata.phone || '',
        avatar_url: metadata.avatar_url || metadata.picture || '',
        language: 'it',
        currency: 'EUR',
        theme: 'light',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: createdProfile, error: createError } = await this.supabase
        .getClient()
        .from('profiles')
        .upsert(newProfile)
        .select()
        .single();

      if (createError) {
        throw createError;
      }

      return this.mapToProfileDto(createdProfile);
    } catch (error) {
      this.logger.error(
        `Errore nella creazione/verifica del profilo: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Aggiorna il timestamp dell'ultimo accesso
   */
  async updateLastActive(userId: string): Promise<void> {
    try {
      await this.supabase
        .getClient()
        .from('profiles')
        .update({ last_active: new Date().toISOString() })
        .eq('id', userId);
    } catch (error) {
      // Logghiamo l'errore ma non lo propaghiamo per non bloccare altre operazioni
      this.logger.warn(
        `Errore nell'aggiornamento di lastActive: ${error.message}`,
      );
    }
  }

  /**
   * Carica un avatar per l'utente
   */
  async uploadAvatar(
    userId: string,
    fileBuffer: Buffer,
    fileExt: string,
  ): Promise<string> {
    try {
      const timestamp = Date.now();
      const filePath = `${userId}/${timestamp}.${fileExt}`;

      const { error } = await this.supabase
        .getClient()
        .storage.from('user-avatars')
        .upload(filePath, fileBuffer, {
          contentType: `image/${fileExt}`,
          upsert: true,
        });

      if (error) {
        throw error;
      }

      // Ottieni l'URL pubblico
      const { data: urlData } = this.supabase
        .getClient()
        .storage.from('user-avatars')
        .getPublicUrl(filePath);

      // Aggiorna il profilo con il nuovo URL dell'avatar
      await this.updateProfile(userId, { avatarUrl: urlData.publicUrl });

      return urlData.publicUrl;
    } catch (error) {
      this.logger.error(`Errore nel caricamento dell'avatar: ${error.message}`);
      throw error;
    }
  }

  /**
   * Mappa un record dal database al DTO
   */
  private mapToProfileDto(dbRecord: any): ProfileDto {
    return {
      id: dbRecord.id,
      firstName: dbRecord.name,
      lastName: dbRecord.surname,
      displayName: dbRecord.display_name,
      phoneNumber: dbRecord.phone_number,
      avatarUrl: dbRecord.avatar_url,
      language: dbRecord.language || 'it',
      currency: dbRecord.currency || 'EUR',
      theme: dbRecord.theme || 'light',
      lastActive: dbRecord.last_active ? new Date(dbRecord.last_active) : null,
      createdAt: new Date(dbRecord.created_at),
      updatedAt: new Date(dbRecord.updated_at),
    };
  }

  /**
   * Mappa un DTO a un record per il database
   */
  private mapToDbRecord(dto: UpdateProfileDto): any {
    const record: any = {};

    if (dto.firstName !== undefined) record.name = dto.firstName;
    if (dto.lastName !== undefined) record.surname = dto.lastName;
    if (dto.displayName !== undefined) record.display_name = dto.displayName;
    if (dto.phoneNumber !== undefined) record.phone_number = dto.phoneNumber;
    if (dto.avatarUrl !== undefined) record.avatar_url = dto.avatarUrl;
    if (dto.language !== undefined) record.language = dto.language;
    if (dto.currency !== undefined) record.currency = dto.currency;
    if (dto.theme !== undefined) record.theme = dto.theme;

    return record;
  }
}
