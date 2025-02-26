import { Injectable, ForbiddenException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class ExpensesService {
  constructor(private readonly supabase: SupabaseService) {}

  async create(
    body: {
      groupId: string;
      amount: number;
      currency: string;
      description?: string;
      paidBy: string;
      category?: string;
      splitMethod: 'equal' | 'custom';
      participants: { userId: string; amount: number }[];
    },
    userId: string,
  ) {
    // Controlla se l'utente è membro del gruppo
    const { data: membership } = await this.supabase
      .getClient()
      .from('group_members')
      .select('id')
      .eq('group_id', body.groupId)
      .eq('user_id', userId)
      .single();

    if (!membership) {
      throw new ForbiddenException('Non fai parte di questo gruppo');
    }

    // Crea la spesa e seleziona l'ID della spesa creata
    const { data: expense, error } = await this.supabase
      .getClient()
      .from('expenses')
      .insert([
        {
          group_id: body.groupId,
          amount: body.amount,
          currency: body.currency,
          description: body.description,
          paid_by: body.paidBy,
          category: body.category,
          split_method: body.splitMethod,
        },
      ])
      .select('id, paid_by, amount') // 👈 Seleziona l'ID e il pagatore della spesa
      .single();

    if (error || !expense) {
      throw new Error(
        error?.message || 'Errore durante la creazione della spesa',
      );
    }

    // Aggiungere i partecipanti alla spesa
    const participantsData = body.participants.map((p) => ({
      expense_id: expense.id,
      user_id: p.userId,
      amount: p.amount,
    }));

    await this.supabase
      .getClient()
      .from('expense_participants')
      .insert(participantsData);

    // Aggiornare il bilancio del gruppo
    for (const participant of body.participants) {
      if (participant.userId !== expense.paid_by) {
        await this.updateBalance(
          body.groupId,
          participant.userId,
          expense.paid_by,
          participant.amount,
        );
      }
    }

    return { message: 'Spesa registrata con successo', expense };
  }

  async getNetBalances(groupId: string, userId: string) {
    const { data: membership } = await this.supabase
      .getClient()
      .from('group_members')
      .select('id')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .single();

    if (!membership) {
      throw new ForbiddenException('Non fai parte di questo gruppo');
    }

    const { data: balances } = await this.supabase
      .getClient()
      .from('group_balances')
      .select('user_id, owes_to, amount')
      .eq('group_id', groupId);

    if (!balances) return [];

    let netBalances = {};

    balances.forEach((b) => {
      let key = [b.user_id, b.owes_to].sort().join('-');

      if (!netBalances[key]) {
        netBalances[key] = 0;
      }

      if (b.user_id < b.owes_to) {
        netBalances[key] += b.amount;
      } else {
        netBalances[key] -= b.amount;
      }
    });

    return Object.entries(netBalances).map(([key, amount]) => {
      const [user1, user2] = key.split('-');
      return { user1, user2, amount };
    });
  }

  async simplifyBalances(groupId: string) {
    const { data: balances } = await this.supabase
      .getClient()
      .from('group_balances')
      .select('*')
      .eq('group_id', groupId);

    if (!balances) return [];

    for (let i = 0; i < balances.length; i++) {
      for (let j = i + 1; j < balances.length; j++) {
        if (
          balances[i].user_id === balances[j].owes_to &&
          balances[i].owes_to === balances[j].user_id
        ) {
          const newBalance = balances[i].amount - balances[j].amount;

          if (newBalance > 0) {
            await this.supabase
              .getClient()
              .from('group_balances')
              .update({ amount: newBalance })
              .eq('id', balances[i].id);
            await this.supabase
              .getClient()
              .from('group_balances')
              .delete()
              .eq('id', balances[j].id);
          }
        }
      }
    }
    return { message: 'Bilanci semplificati con successo' };
  }

  async updateExpenseStatus(expenseId: string) {
    const { data: participants } = await this.supabase
      .getClient()
      .from('expense_participants')
      .select('settled')
      .eq('expense_id', expenseId);

    if (!participants || participants.length === 0) {
      return; // Nessun partecipante, non serve aggiornare lo stato
    }

    if (participants.every((p) => p.settled)) {
      await this.supabase
        .getClient()
        .from('expenses')
        .update({ status: 'paid', updated_at: new Date().toISOString() })
        .eq('id', expenseId);
    }
  }

  async getBalances(groupId: string, userId: string) {
    // Controlla se l'utente è membro del gruppo
    const { data: membership } = await this.supabase
      .getClient()
      .from('group_members')
      .select('id')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .single();

    if (!membership) {
      throw new ForbiddenException('Non fai parte di questo gruppo');
    }

    // Recupera il bilancio di tutti i membri del gruppo
    const { data, error } = await this.supabase
      .getClient()
      .from('group_balances')
      .select('user_id, owes_to, amount')
      .eq('group_id', groupId);

    if (error) throw new Error(error.message);
    return data;
  }

  async findAll(groupId: string, userId: string) {
    // Controlla se l'utente è membro del gruppo
    const { data: membership } = await this.supabase
      .getClient()
      .from('group_members')
      .select('id')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .single();

    if (!membership)
      throw new ForbiddenException('Non fai parte di questo gruppo');

    // Recupera le spese del gruppo
    const { data, error } = await this.supabase
      .getClient()
      .from('expenses')
      .select('*')
      .eq('group_id', groupId);

    if (error) throw new Error(error.message);
    return data;
  }

  async settleExpense(expenseId: string, userId: string, requesterId: string) {
    // Controlla se l'utente sta saldando la propria parte
    const { data } = await this.supabase
      .getClient()
      .from('expense_participants')
      .select('id')
      .eq('expense_id', expenseId)
      .eq('user_id', userId)
      .single();

    if (!data) throw new ForbiddenException('Non sei assegnato a questa spesa');

    await this.supabase
      .getClient()
      .from('expense_participants')
      .update({ settled: true, settled_at: new Date().toISOString() })
      .eq('expense_id', expenseId)
      .eq('user_id', userId);

    return { message: 'Spesa saldata con successo' };
  }

  async remove(expenseId: string, userId: string) {
    // Controlla se l'utente ha creato la spesa
    const { data } = await this.supabase
      .getClient()
      .from('expenses')
      .select('paid_by')
      .eq('id', expenseId)
      .single();

    if (!data || data.paid_by !== userId) {
      throw new ForbiddenException(
        'Solo chi ha registrato la spesa può eliminarla',
      );
    }

    await this.supabase
      .getClient()
      .from('expenses')
      .delete()
      .eq('id', expenseId);
    return { message: 'Spesa eliminata con successo' };
  }

  async updateBalance(
    groupId: string,
    userId: string,
    owesTo: string,
    amount: number,
  ) {
    const { data: existingBalance } = await this.supabase
      .getClient()
      .from('group_balances')
      .select('id, amount')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .eq('owes_to', owesTo)
      .single();

    if (existingBalance) {
      let newAmount = existingBalance.amount + amount;

      if (newAmount === 0) {
        // Se il bilancio è 0, eliminiamo la riga
        await this.supabase
          .getClient()
          .from('group_balances')
          .delete()
          .eq('id', existingBalance.id);
      } else {
        // Aggiorniamo l'importo
        await this.supabase
          .getClient()
          .from('group_balances')
          .update({ amount: newAmount })
          .eq('id', existingBalance.id);
      }
    } else {
      // Creiamo una nuova riga solo se il debito non è zero
      if (amount !== 0) {
        await this.supabase
          .getClient()
          .from('group_balances')
          .insert([
            { group_id: groupId, user_id: userId, owes_to: owesTo, amount },
          ]);
      }
    }
  }
}
