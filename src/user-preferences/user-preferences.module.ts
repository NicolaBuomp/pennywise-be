import { Module } from '@nestjs/common';
import { UserPreferencesService } from './user-preferences.service';
import { UserPreferencesController } from './user-preferences.controller';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  controllers: [UserPreferencesController],
  providers: [UserPreferencesService],
  exports: [UserPreferencesService],
})
export class UserPreferencesModule {}
