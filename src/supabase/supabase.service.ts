import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private supabase: SupabaseClient;
  private supabaseAdmin: SupabaseClient;
  private readonly logger = new Logger(SupabaseService.name);

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>(
      'SUPABASE_SERVICE_ROLE_KEY',
    );
    const supabaseAnonKey = this.configService.get<string>('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseKey || !supabaseAnonKey) {
      const errorMessage = 'Supabase configuration is missing or incomplete!';
      this.logger.error(errorMessage);
      throw new InternalServerErrorException(errorMessage);
    }

    const options = {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: { 'x-application-name': 'pennywise-be' },
      },
    };

    this.logger.log('Initializing Supabase clients');
    this.supabase = createClient(supabaseUrl, supabaseAnonKey, options);
    this.supabaseAdmin = createClient(supabaseUrl, supabaseKey, options);
  }

  getClient(): SupabaseClient {
    return this.supabase;
  }

  getAdminClient(): SupabaseClient {
    return this.supabaseAdmin;
  }
}
