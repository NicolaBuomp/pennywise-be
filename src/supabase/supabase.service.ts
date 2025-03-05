import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor(private readonly configService: ConfigService) {
    this.supabase = createClient(
      this.configService.get<string>('SUPABASE_URL') || '',
      this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY') || '',
    );
  }

  getClient(): SupabaseClient {
    return this.supabase;
  }

  async authVerifyToken(token: string) {
    return this.supabase.auth.getUser(token);
  }

  /**
   * Recupera i dati di un utente combinando i dati da auth.users e user-preferences
   */
  async getUserById(userId: string) {
    try {
      // Recupera i dati utente da auth.users
      const { data: authData, error: authError } =
        await this.supabase.auth.admin.getUserById(userId);

      if (authError || !authData?.user) {
        console.error(
          `Errore nel recuperare i dati auth per l'utente ${userId}:`,
          authError,
        );
        throw new Error(
          `Utente non trovato: ${authError?.message || 'ID non valido'}`,
        );
      }

      // Recupera le preferenze dell'utente
      const { data: preferencesData } = await this.supabase
        .from('user-preferences')
        .select('language, currency')
        .eq('user_id', userId)
        .maybeSingle();

      // Estrai metadata utile dall'utente
      const user = authData.user;
      const userMetadata = user.user_metadata || {};

      // Combina i dati e restituisci un oggetto compatibile
      return {
        id: user.id,
        email: user.email,
        first_name: userMetadata.first_name || '',
        last_name: userMetadata.last_name || '',
        full_name:
          `${userMetadata.first_name || ''} ${userMetadata.last_name || ''}`.trim() ||
          'Utente',
        phone_number: user.phone || userMetadata.phone_number || null,
        avatar_url: userMetadata.avatar_url || null,
        language: preferencesData?.language || 'it',
        currency: preferencesData?.currency || 'EUR',
      };
    } catch (error) {
      console.error(`Errore nel recuperare l'utente ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Recupera più utenti contemporaneamente (per migliorare le performance)
   */
  async getUsersByIds(userIds: string[]) {
    if (!userIds || userIds.length === 0) return [];

    // Rimuovi eventuali duplicati
    const uniqueIds = [...new Set(userIds)];

    // Recupera gli utenti uno alla volta (in futuro potremmo ottimizzare con chiamate batch)
    const users = await Promise.all(
      uniqueIds.map(async (id) => {
        try {
          return await this.getUserById(id);
        } catch (error) {
          console.warn(`Impossibile recuperare l'utente ${id}:`, error);
          // Restituisci un profilo utente generico in caso di errore
          return {
            id,
            email: null,
            first_name: '',
            last_name: '',
            full_name: 'Utente sconosciuto',
            phone_number: null,
            avatar_url: null,
            language: 'it',
            currency: 'EUR',
          };
        }
      }),
    );

    return users;
  }

  async getUserGroups(userId: string) {
    return this.supabase
      .from('group_members')
      .select('group_id, role')
      .eq('user_id', userId);
  }

  async insertExpense(expenseData: any) {
    return this.supabase.from('expenses').insert(expenseData);
  }

  async updateExpense(expenseId: string, updateData: any) {
    return this.supabase
      .from('expenses')
      .update(updateData)
      .eq('id', expenseId);
  }

  async deleteExpense(expenseId: string) {
    return this.supabase.from('expenses').delete().eq('id', expenseId);
  }

  async getShoppingLists(userId: string) {
    return this.supabase
      .from('shopping_lists')
      .select('*')
      .eq(
        'group_id',
        this.supabase
          .from('group_members')
          .select('group_id')
          .eq('user_id', userId),
      );
  }
}
