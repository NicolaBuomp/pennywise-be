import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateExpenseDto, SettleExpenseDto } from './dto/expense.dto';

@Injectable()
export class ExpensesService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async createExpense(userId: string, createExpenseDto: CreateExpenseDto) {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('expenses')
      .insert({ ...createExpenseDto, user_id: userId })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    await this.recalculateBalances(createExpenseDto.group_id);
    return data;
  }

  async getExpensesByGroup(groupId: string) {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('expenses')
      .select('*')
      .eq('group_id', groupId);

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  async getExpenseById(expenseId: string) {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('expenses')
      .select('*')
      .eq('id', expenseId)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  async updateExpense(
    expenseId: string,
    updateData: Partial<CreateExpenseDto>,
  ) {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('expenses')
      .update(updateData)
      .eq('id', expenseId)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  async deleteExpense(expenseId: string, groupId: string) {
    const { error } = await this.supabaseService
      .getClient()
      .from('expenses')
      .delete()
      .eq('id', expenseId);

    if (error) {
      throw new Error(error.message);
    }

    await this.recalculateBalances(groupId);
  }

  async settleExpense(settleExpenseDto: SettleExpenseDto) {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('expense_participants')
      .insert(settleExpenseDto);

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  async getExpenseParticipants(expenseId: string) {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('expense_participants')
      .select('*')
      .eq('expense_id', expenseId);

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  async recalculateBalances(groupId: string) {
    const supabase = this.supabaseService.getClient();

    const { data: expenses, error: expensesError } = await supabase
      .from('expenses')
      .select('user_id, amount')
      .eq('group_id', groupId);

    if (expensesError) {
      throw new Error(expensesError.message);
    }

    const { data: members, error: membersError } = await supabase
      .from('group_members')
      .select('user_id')
      .eq('group_id', groupId);

    if (membersError) {
      throw new Error(membersError.message);
    }

    const balances: { [userId: string]: number } = {};
    members.forEach((member) => (balances[member.user_id] = 0));

    expenses.forEach((expense) => {
      const share = expense.amount / members.length;
      balances[expense.user_id] += expense.amount - share;
      members.forEach((member) => {
        if (member.user_id !== expense.user_id) {
          balances[member.user_id] -= share;
        }
      });
    });

    for (const [userId, balance] of Object.entries(balances)) {
      await supabase
        .from('group_members')
        .update({ balance })
        .eq('group_id', groupId)
        .eq('user_id', userId);
    }
  }
}
