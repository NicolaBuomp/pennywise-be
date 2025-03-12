import { Module, Global } from '@nestjs/common';
import { SupabaseService } from './supabase.service';

@Global() // Rende il servizio disponibile in tutta l'app
@Module({
  providers: [SupabaseService],
  exports: [SupabaseService],
})
export class SupabaseModule {}
