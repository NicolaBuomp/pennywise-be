import { Injectable, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CompleteProfileDto } from '../auth/dto/complete-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(private readonly supabaseService: SupabaseService) {}

  // Recupera profilo utente
  async getUserProfile(userId: string) {
    const { data, error } = await this.supabaseService
      .getAdminClient()
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) return null;
    return data;
  }

  // Verifica se il profilo utente è completo
  async isProfileComplete(userId: string): Promise<boolean> {
    const profile = await this.getUserProfile(userId);
    return profile !== null;
  }

  // Completa il profilo utente
  async completeProfile(userId: string, dto: CompleteProfileDto) {
    const { data, error } = await this.supabaseService
      .getAdminClient()
      .from('users')
      .insert({
        id: userId,
        username: dto.username,
        first_name: dto.first_name,
        last_name: dto.last_name,
        avatar_url: dto.avatar_url,
        phone_number: dto.phone_number,
      });

    if (error) throw new BadRequestException(error.message);
    return { message: 'Profilo completato con successo.' };
  }

  // Aggiorna il profilo utente
  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const { data, error } = await this.supabaseService
      .getAdminClient()
      .from('users')
      .update({
        ...(dto.username && { username: dto.username }),
        ...(dto.first_name && { first_name: dto.first_name }),
        ...(dto.last_name && { last_name: dto.last_name }),
        ...(dto.avatar_url && { avatar_url: dto.avatar_url }),
        ...(dto.phone_number && { phone_number: dto.phone_number }),
      })
      .eq('id', userId);

    if (error) throw new BadRequestException(error.message);
    return { message: 'Profilo aggiornato con successo.' };
  }

  // Elimina un utente
  async deleteUser(userId: string) {
    // Prima eliminiamo i dati dal database
    const { error: dbError } = await this.supabaseService
      .getAdminClient()
      .from('users')
      .delete()
      .eq('id', userId);

    if (dbError) throw new BadRequestException(dbError.message);

    // Poi eliminiamo l'utente dall'autenticazione
    const { error: authError } = await this.supabaseService
      .getAdminClient()
      .auth.admin.deleteUser(userId);

    if (authError) throw new BadRequestException(authError.message);

    return { message: 'Utente eliminato con successo.' };
  }

  // Ottieni tutti gli utenti (solo per admin)
  async getAllUsers() {
    const { data, error } = await this.supabaseService
      .getAdminClient()
      .from('users')
      .select('*');

    if (error) throw new BadRequestException(error.message);
    return data;
  }
}
