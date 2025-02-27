import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor(private readonly configService: ConfigService) {
    this.supabase = createClient(
      this.configService.get<string>('SUPABASE_URL') || '',
      this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY') || '',
    );
  }

  getClient(): SupabaseClient {
    return this.supabase;
  }

  async authVerifyToken(token: string) {
    return this.supabase.auth.getUser(token);
  }

  async getUserById(userId: string) {
    return this.supabase.from('profiles').select('*').eq('id', userId).single();
  }

  async getUserGroups(userId: string) {
    return this.supabase
      .from('group_members')
      .select('group_id, role')
      .eq('user_id', userId);
  }

  async insertExpense(expenseData: any) {
    return this.supabase.from('expenses').insert(expenseData);
  }

  async updateExpense(expenseId: string, updateData: any) {
    return this.supabase
      .from('expenses')
      .update(updateData)
      .eq('id', expenseId);
  }

  async deleteExpense(expenseId: string) {
    return this.supabase.from('expenses').delete().eq('id', expenseId);
  }

  async getShoppingLists(userId: string) {
    return this.supabase
      .from('shopping_lists')
      .select('*')
      .eq(
        'group_id',
        this.supabase
          .from('group_members')
          .select('group_id')
          .eq('user_id', userId),
      );
  }
}
