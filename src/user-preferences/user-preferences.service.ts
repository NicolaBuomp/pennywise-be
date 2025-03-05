import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { UpdateUserPreferencesDto } from './dto/update-user-preferences.dto';

@Injectable()
export class UserPreferencesService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async getPreferences(userId: string): Promise<any> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      // Create default preferences if none exist
      return this.createDefaultPreferences(userId);
    }

    return data;
  }

  async updatePreferences(
    userId: string,
    updatePreferencesDto: UpdateUserPreferencesDto,
  ): Promise<any> {
    // First check if preferences exist
    const { data: existingPrefs } = await this.supabaseService
      .getClient()
      .from('user_preferences')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!existingPrefs) {
      // Create with defaults and update with provided values
      return this.createDefaultPreferences(userId, updatePreferencesDto);
    }

    // Update existing preferences
    const { data, error } = await this.supabaseService
      .getClient()
      .from('user_preferences')
      .update({
        ...updatePreferencesDto,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  private async createDefaultPreferences(
    userId: string,
    customValues?: Partial<UpdateUserPreferencesDto>,
  ): Promise<any> {
    const defaultPreferences = {
      user_id: userId,
      language: 'it',
      currency: 'EUR',
      ...customValues,
    };

    const { data, error } = await this.supabaseService
      .getClient()
      .from('user_preferences')
      .insert(defaultPreferences)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create default preferences: ${error.message}`);
    }

    return data;
  }
}
