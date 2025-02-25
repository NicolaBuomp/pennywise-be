import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
} from '@nestjs/common';
import { ShoppingItemsService } from './shopping-items.service';

@Controller('shopping-items')
export class ShoppingItemsController {
  constructor(private readonly shoppingItemsService: ShoppingItemsService) {}

  @Post()
  create(
    @Req() req,
    @Body()
    body: {
      listId: string;
      name: string;
      quantity?: number;
      unit?: string | null;
    },
  ) {
    return this.shoppingItemsService.create(
      body.listId,
      body.name,
      body.quantity ?? 1,
      body.unit ?? 'pezzi',
      req.user.id,
    );
  }

  @Get(':listId')
  findAll(@Req() req, @Param('listId') listId: string) {
    return this.shoppingItemsService.findAll(listId, req.user.id);
  }

  @Patch(':id')
  update(
    @Req() req,
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      quantity?: number;
      unit?: string;
      completed?: boolean;
    },
  ) {
    return this.shoppingItemsService.update(id, body, req.user.id);
  }

  @Delete(':id')
  remove(@Req() req, @Param('id') id: string) {
    return this.shoppingItemsService.remove(id, req.user.id);
  }
}
