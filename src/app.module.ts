import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GroupsModule } from './groups/groups.module';
import { SupabaseModule } from './supabase/supabase.module';
import { ShoppingListModule } from './shopping-list/shopping-list.module';
import { ExpensesModule } from './expenses/expenses.module';
import { AuthMiddleware } from './middleware/auth.middleware';
import { ShoppingItemsModule } from './shopping-items/shopping-items.module';
import { ProfilesModule } from './profiles/profiles.module';

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
    ShoppingListModule,
    ShoppingItemsModule,
    ExpensesModule,
    ProfilesModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AuthMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
