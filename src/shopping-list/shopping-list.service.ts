import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';

@Injectable()
export class ShoppingListService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async create(createItemDto: CreateItemDto) {
    const client = this.supabaseService.getClient();
    const { data, error } = await client
      .from('shopping_list')
      .insert(createItemDto)
      .single();
    if (error) {
      throw error;
    }
    return data;
  }

  async findAll() {
    const client = this.supabaseService.getClient();
    const { data, error } = await client.from('shopping_list').select('*');
    if (error) {
      throw error;
    }
    return data;
  }

  async findOne(id: string) {
    const client = this.supabaseService.getClient();
    const { data, error } = await client
      .from('shopping_list')
      .select('*')
      .eq('id', id)
      .single();
    if (error) {
      throw new NotFoundException('Item not found');
    }
    return data;
  }

  async update(id: string, updateItemDto: UpdateItemDto) {
    const client = this.supabaseService.getClient();
    const { data, error } = await client
      .from('shopping_list')
      .update(updateItemDto)
      .eq('id', id)
      .single();
    if (error) {
      throw error;
    }
    return data;
  }

  async remove(id: string) {
    const client = this.supabaseService.getClient();
    const { data, error } = await client
      .from('shopping_list')
      .delete()
      .eq('id', id)
      .single();
    if (error) {
      throw error;
    }
    return data;
  }
}
