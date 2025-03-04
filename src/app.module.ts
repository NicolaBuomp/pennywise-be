import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GroupsModule } from './groups/groups.module';
import { SupabaseModule } from './supabase/supabase.module';
import { ShoppingListModule } from './shopping-list/shopping-list.module';
import { ExpensesModule } from './expenses/expenses.module';
import { AuthMiddleware } from './middleware/auth.middleware';
import { ShoppingItemsModule } from './shopping-items/shopping-items.module';
import { ProfilesModule } from './profiles/profiles.module';
import { ExpensesController } from './expenses/expenses.controller';
import { GroupsController } from './groups/groups.controller';
import { ProfilesController } from './profiles/profiles.controller';
import { ShoppingItemsController } from './shopping-items/shopping-items.controller';
import { ShoppingListController } from './shopping-list/shopping-list.controller';

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
    ProfilesModule,
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
        ProfilesController,
      );
  }
}
