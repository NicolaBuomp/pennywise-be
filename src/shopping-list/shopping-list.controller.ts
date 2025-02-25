import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Req,
  Patch,
} from '@nestjs/common';
import { ShoppingListService } from './shopping-list.service';

@Controller('shopping-lists')
export class ShoppingListController {
  constructor(private readonly shoppingListService: ShoppingListService) {}

  @Post()
  create(@Req() req, @Body() body: { groupId: string; name: string }) {
    return this.shoppingListService.create(
      body.groupId,
      body.name,
      req.user.id,
    );
  }

  @Get(':groupId')
  findAll(@Req() req, @Param('groupId') groupId: string) {
    return this.shoppingListService.findAll(groupId, req.user.id);
  }

  @Patch(':id')
  update(@Req() req, @Param('id') id: string, @Body() body: { name: string }) {
    return this.shoppingListService.updateName(id, body.name, req.user.id);
  }

  @Delete(':id')
  remove(@Req() req, @Param('id') id: string) {
    return this.shoppingListService.remove(id, req.user.id);
  }
}
