import { Injectable } from '@nestjs/common';
import {
  createClient,
  SupabaseClient,
  PostgrestResponse,
} from '@supabase/supabase-js';
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

  // Espongo direttamente l'oggetto auth di Supabase
  get auth() {
    return this.supabase.auth;
  }

  /**
   * Recupera un utente dalla tabella auth.users (o users) in base al suo ID.
   */
  async getUserById(userId: string) {
    const { data, error }: PostgrestResponse<any> = await this.supabase
      .from('auth.users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      throw new Error(`Errore nel recupero dell'utente: ${error.message}`);
    }
    return data;
  }

  /**
   * Esegue una query generica su una tabella.
   * conditions è un oggetto chiave/valore da applicare con eq()
   */
  async query(table: string, conditions: { [key: string]: any } = {}) {
    let query = this.supabase.from(table).select('*');

    Object.keys(conditions).forEach((key) => {
      query = query.eq(key, conditions[key]);
    });

    const { data, error } = await query;
    if (error) {
      throw new Error(`Errore nella query su ${table}: ${error.message}`);
    }
    return data;
  }

  /**
   * Inserisce un nuovo record in una tabella.
   */
  async insert(table: string, payload: any) {
    const { data, error } = await this.supabase.from(table).insert(payload);
    if (error) {
      throw new Error(`Errore nell'inserimento in ${table}: ${error.message}`);
    }
    return data;
  }

  /**
   * Aggiorna dei record in una tabella in base alle condizioni fornite.
   */
  async update(
    table: string,
    payload: any,
    conditions: { [key: string]: any } = {},
  ) {
    let query = this.supabase.from(table).update(payload);

    Object.keys(conditions).forEach((key) => {
      query = query.eq(key, conditions[key]);
    });

    const { data, error } = await query;
    if (error) {
      throw new Error(
        `Errore nell'aggiornamento di ${table}: ${error.message}`,
      );
    }
    return data;
  }

  /**
   * Elimina record da una tabella in base alle condizioni fornite.
   */
  async delete(table: string, conditions: { [key: string]: any } = {}) {
    let query = this.supabase.from(table).delete();

    Object.keys(conditions).forEach((key) => {
      query = query.eq(key, conditions[key]);
    });

    const { data, error } = await query;
    if (error) {
      throw new Error(
        `Errore nella cancellazione da ${table}: ${error.message}`,
      );
    }
    return data;
  }
}
