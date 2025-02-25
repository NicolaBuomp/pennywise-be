import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { ShoppingListService } from './shopping-list.service';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';

@Controller('shopping-list')
export class ShoppingListController {
  constructor(private readonly shoppingListService: ShoppingListService) {}

  @Post()
  async create(@Body() createItemDto: CreateItemDto) {
    return this.shoppingListService.create(createItemDto);
  }

  @Get()
  async findAll() {
    return this.shoppingListService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.shoppingListService.findOne(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateItemDto: UpdateItemDto) {
    return this.shoppingListService.update(id, updateItemDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.shoppingListService.remove(id);
  }
}
