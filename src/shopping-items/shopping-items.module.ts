import { Module } from '@nestjs/common';
import { ShoppingItemsService } from './shopping-items.service';
import { ShoppingItemsController } from './shopping-items.controller';

@Module({
  controllers: [ShoppingItemsController],
  providers: [ShoppingItemsService],
})
export class ShoppingItemsModule {}
