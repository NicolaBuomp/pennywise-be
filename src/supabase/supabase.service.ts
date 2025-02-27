import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);
  private supabase: SupabaseClient;

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>(
      'SUPABASE_SERVICE_ROLE_KEY',
    );

    if (!supabaseUrl || !supabaseKey) {
      this.logger.error("Mancano le variabili d'ambiente Supabase necessarie");
    } else {
      this.supabase = createClient(supabaseUrl, supabaseKey);
    }
  }

  getClient(): SupabaseClient {
    if (!this.supabase) {
      this.logger.error('Client Supabase non inizializzato');
      throw new Error('Supabase client non inizializzato');
    }
    return this.supabase;
  }

  async executeQuery(query) {
    try {
      return await query;
    } catch (error) {
      this.logger.error(`Errore nella query: ${error.message}`);
      throw error;
    }
  }
}
