import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { SettleExpenseDto } from './dto/settle-expense.dto';

@Injectable()
export class ExpenseSharesService {
  constructor(private supabaseService: SupabaseService) {}

  /**
   * Segna una o più quote come saldate
   */
  async settleShares(
    groupId: string,
    expenseId: string,
    settleExpenseDto: SettleExpenseDto,
    userId: string,
  ) {
    // Verifica che l'utente sia membro del gruppo
    const { data: membership, error: membershipError } =
      await this.supabaseService
        .getClient()
        .from('group_members')
        .select()
        .eq('group_id', groupId)
        .eq('user_id', userId)
        .maybeSingle();

    if (!membership) {
      throw new ForbiddenException(
        'Devi essere membro del gruppo per gestire le spese',
      );
    }

    // Ottieni i dati sulla spesa
    const { data: expense, error: expenseError } = await this.supabaseService
      .getClient()
      .from('expenses')
      .select()
      .eq('id', expenseId)
      .eq('group_id', groupId)
      .single();

    if (expenseError || !expense) {
      throw new NotFoundException(`Spesa con ID ${expenseId} non trovata`);
    }

    // Verifica che le quote esistano e appartengano alla spesa
    const { data: shares, error: sharesError } = await this.supabaseService
      .getClient()
      .from('expense_shares')
      .select()
      .eq('expense_id', expenseId)
      .in('id', settleExpenseDto.share_ids);

    if (sharesError) {
      throw new Error(
        `Errore nel recupero delle quote: ${sharesError.message}`,
      );
    }

    if (!shares || shares.length !== settleExpenseDto.share_ids.length) {
      throw new BadRequestException('Una o più quote specificate non esistono');
    }

    // Verifica che le quote non siano già state saldate
    const alreadySettled = shares.some((share) => share.is_settled);
    if (alreadySettled) {
      throw new BadRequestException('Una o più quote sono già state saldate');
    }

    // Segna le quote come saldate
    const now = new Date();
    const { data: updatedShares, error } = await this.supabaseService
      .getClient()
      .from('expense_shares')
      .update({
        is_settled: true,
        settled_at: now.toISOString(),
      })
      .in('id', settleExpenseDto.share_ids)
      .select();

    if (error) {
      throw new Error(
        `Errore nell'aggiornamento delle quote: ${error.message}`,
      );
    }

    return {
      success: true,
      message: 'Quote saldate con successo',
      sharedSettled: updatedShares?.length || 0,
    };
  }

  /**
   * Ottieni tutte le quote dell'utente in un gruppo
   */
  async getUserSharesInGroup(groupId: string, userId: string) {
    // Verifica che l'utente sia membro del gruppo
    const { data: membership, error: membershipError } =
      await this.supabaseService
        .getClient()
        .from('group_members')
        .select()
        .eq('group_id', groupId)
        .eq('user_id', userId)
        .maybeSingle();

    if (!membership) {
      throw new ForbiddenException(
        'Devi essere membro del gruppo per visualizzare le quote',
      );
    }

    // Ottieni tutte le quote dell'utente nel gruppo
    const { data: shares, error } = await this.supabaseService
      .getClient()
      .from('expense_shares')
      .select(
        `
        *,
        expense:expense_id(
          id,
          description,
          amount,
          currency,
          date,
          paid_by,
          payer:paid_by(id, display_name, avatar_url)
        )
      `,
      )
      .eq('user_id', userId)
      .eq('is_settled', false)
      .eq('expense.group_id', groupId);

    if (error) {
      throw new Error(`Errore nel recupero delle quote: ${error.message}`);
    }

    return shares || [];
  }

  /**
   * Ottieni il riepilogo dei debiti/crediti dell'utente nel gruppo
   */
  async getUserExpenseSummary(groupId: string, userId: string) {
    // Verifica che l'utente sia membro del gruppo
    const { data: membership, error: membershipError } =
      await this.supabaseService
        .getClient()
        .from('group_members')
        .select()
        .eq('group_id', groupId)
        .eq('user_id', userId)
        .maybeSingle();

    if (!membership) {
      throw new ForbiddenException(
        'Devi essere membro del gruppo per visualizzare il riepilogo',
      );
    }

    // Ottieni spese dove l'utente ha pagato
    const { data: paidExpenses, error: paidError } = await this.supabaseService
      .getClient()
      .from('expenses')
      .select('amount, currency')
      .eq('group_id', groupId)
      .eq('paid_by', userId);

    if (paidError) {
      throw new Error(
        `Errore nel recupero delle spese pagate: ${paidError.message}`,
      );
    }

    // Ottieni tutte le quote dell'utente
    const { data: userShares, error: sharesError } = await this.supabaseService
      .getClient()
      .from('expense_shares')
      .select(
        `
        amount,
        is_settled,
        expense:expense_id(currency)
      `,
      )
      .eq('user_id', userId)
      .eq('expense.group_id', groupId);

    if (sharesError) {
      throw new Error(
        `Errore nel recupero delle quote: ${sharesError.message}`,
      );
    }

    // Calcola i totali
    const totalPaid = (paidExpenses || []).reduce(
      (sum, expense) => sum + expense.amount,
      0,
    );

    const totalOwed = (userShares || []).reduce(
      (sum, share) => sum + share.amount,
      0,
    );

    const totalPending = (userShares || [])
      .filter((share) => !share.is_settled)
      .reduce((sum, share) => sum + share.amount, 0);

    const totalSettled = (userShares || [])
      .filter((share) => share.is_settled)
      .reduce((sum, share) => sum + share.amount, 0);

    // Ottieni la valuta del gruppo
    const { data: group, error: groupError } = await this.supabaseService
      .getClient()
      .from('groups')
      .select('default_currency')
      .eq('id', groupId)
      .single();

    const currency = group?.default_currency || 'EUR';

    return {
      totalPaid,
      totalOwed,
      totalPending,
      totalSettled,
      balance: totalPaid - totalOwed,
      currency,
    };
  }
}
