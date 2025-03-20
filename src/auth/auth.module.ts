import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [SupabaseModule, UsersModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
