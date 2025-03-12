import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SupabaseModule } from './supabase/supabase.module';
import { AuthModule } from './auth/auth.module';
import { GroupsModule } from './groups/groups.module';
import { GroupInvitesModule } from './groups/group-invite/group-invite.module';
import { GroupJoinRequestsModule } from './groups/group-join-request/group-join-request.module';
import { ExpensesModule } from './expenses/expenses.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    SupabaseModule,
    AuthModule,
    GroupsModule,
    GroupInvitesModule,
    GroupJoinRequestsModule,
    ExpensesModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
