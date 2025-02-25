import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';

@Injectable()
export class ExpensesService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async create(createExpenseDto: CreateExpenseDto) {
    const client = this.supabaseService.getClient();
    const { data, error } = await client
      .from('expenses')
      .insert(createExpenseDto)
      .single();
    if (error) {
      throw error;
    }
    return data;
  }

  async findAll() {
    const client = this.supabaseService.getClient();
    const { data, error } = await client.from('expenses').select('*');
    if (error) {
      throw error;
    }
    return data;
  }

  async findOne(id: string) {
    const client = this.supabaseService.getClient();
    const { data, error } = await client
      .from('expenses')
      .select('*')
      .eq('id', id)
      .single();
    if (error) {
      throw new NotFoundException('Expense not found');
    }
    return data;
  }

  async update(id: string, updateExpenseDto: UpdateExpenseDto) {
    const client = this.supabaseService.getClient();
    const { data, error } = await client
      .from('expenses')
      .update(updateExpenseDto)
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
      .from('expenses')
      .delete()
      .eq('id', id)
      .single();
    if (error) {
      throw error;
    }
    return data;
  }
}
