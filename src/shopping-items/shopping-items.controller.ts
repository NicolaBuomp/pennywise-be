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
import { CreateItemDto, UpdateItemDto } from './dto/create-item.dto';

@Controller('shopping-items')
export class ShoppingItemsController {
  constructor(private readonly shoppingItemsService: ShoppingItemsService) {}

  @Post()
  create(@Req() req, @Body() createItemDto: CreateItemDto) {
    return this.shoppingItemsService.create(
      createItemDto.shopping_list_id,
      createItemDto.name,
      createItemDto.quantity ?? 1,
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
    @Body() updateItemDto: UpdateItemDto,
  ) {
    return this.shoppingItemsService.update(id, updateItemDto, req.user.id);
  }

  @Delete(':id')
  remove(@Req() req, @Param('id') id: string) {
    return this.shoppingItemsService.remove(id, req.user.id);
  }
}
