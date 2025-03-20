import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService], // Esportiamo il servizio per usarlo in altri moduli
})
export class UsersModule {}
