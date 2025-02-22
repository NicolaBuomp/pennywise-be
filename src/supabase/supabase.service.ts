import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_KEY');
    if (supabaseUrl != null) {
      if (supabaseKey != null) {
        this.supabase = createClient(supabaseUrl, supabaseKey);
      }
    }
  }

  getClient(): SupabaseClient {
    return this.supabase;
  }
}