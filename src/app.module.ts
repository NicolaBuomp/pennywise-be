import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GroupsModule } from './groups/groups.module';
import { SupabaseModule } from './supabase/supabase.module';
import { ShoppingListModule } from './shopping-list/shopping-list.module';
import { ExpensesModule } from './expenses/expenses.module';
import { AuthMiddleware } from './middleware/auth.middleware';
import { ShoppingItemsModule } from './shopping-items/shopping-items.module';
import { ExpensesController } from './expenses/expenses.controller';
import { GroupsController } from './groups/groups.controller';
import { ShoppingItemsController } from './shopping-items/shopping-items.controller';
import { ShoppingListController } from './shopping-list/shopping-list.controller';
import { UserPreferencesModule } from './user-preferences/user-preferences.module';
import { UserPreferencesController } from './user-preferences/user-preferences.controller';


@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath:
        process.env.NODE_ENV === 'production'
          ? '.env.production'
          : '.env.development.local',
      isGlobal: true,
    }),
    SupabaseModule,
    GroupsModule,
    ShoppingListModule,
    ShoppingItemsModule,
    ExpensesModule,
    UserPreferencesModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AuthMiddleware)
      .forRoutes(
        GroupsController,
        ShoppingListController,
        ShoppingItemsController,
        ExpensesController,
        UserPreferencesController,
      );
  }
}
