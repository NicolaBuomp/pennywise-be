import { Injectable } from '@nestjs/common';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class GroupsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async create(createGroupDto: CreateGroupDto) {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('groups')
      .insert([createGroupDto]);
    if (error) {
      throw new Error(error.message);
    }
    return data;
  }

  async findAll() {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('groups')
      .select('*');
    if (error) {
      throw new Error(error.message);
    }
    return data;
  }

  async findOne(id: number) {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('groups')
      .select('*')
      .eq('id', id)
      .single();
    if (error) {
      throw new Error(error.message);
    }
    return data;
  }

  async update(id: number, updateGroupDto: UpdateGroupDto) {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('groups')
      .update(updateGroupDto)
      .eq('id', id);
    if (error) {
      throw new Error(error.message);
    }
    return data;
  }

  async remove(id: number) {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('groups')
      .delete()
      .eq('id', id);
    if (error) {
      throw new Error(error.message);
    }
    return data;
  }
}