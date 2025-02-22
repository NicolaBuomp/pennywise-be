import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GroupsModule } from './groups/groups.module';
import { SupabaseModule } from './supabase/supabase.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath:
        process.env.NODE_ENV === 'production'
          ? '.env.production'
          : '.env.development',
      isGlobal: true,
    }),
    SupabaseModule,
    GroupsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
