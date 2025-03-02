import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateExpenseDto } from './dto/expense.dto';

@Injectable()
export class ExpensesService {
  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Crea una nuova spesa e aggiorna automaticamente i bilanci del gruppo
   */
  async createExpense(userId: string, createExpenseDto: CreateExpenseDto) {
    const { group_id, description, amount, currency, participants } =
      createExpenseDto;
    const supabase = this.supabaseService.getClient();

    // 1️⃣ Inseriamo la spesa nel log delle spese
    const { data: expenseData, error: expenseError } = await supabase
      .from('expenses_log')
      .insert({ group_id, user_id: userId, description, amount, currency })
      .select('id')
      .single();

    if (expenseError) {
      throw new InternalServerErrorException(
        `❌ Errore nella creazione della spesa: ${expenseError.message}`,
      );
    }

    const expenseId = expenseData.id;

    // 2️⃣ Calcoliamo il debito di ogni partecipante
    const totalParticipants = participants.length;
    const share = amount / totalParticipants;

    const balanceUpdates = participants.map((p) => ({
      group_id,
      payer_id: userId,
      user_id: p.user_id,
      amount: p.share_amount || share,
      currency,
    }));

    // 3️⃣ Inseriamo i bilanci nel gruppo
    const { error: balanceError } = await supabase
      .from('group_balances')
      .insert(balanceUpdates);

    if (balanceError) {
      throw new InternalServerErrorException(
        `❌ Errore nell'aggiornamento dei bilanci: ${balanceError.message}`,
      );
    }

    return {
      id: expenseId,
      message: '✅ Spesa registrata e bilanci aggiornati!',
    };
  }

  /**
   * Recupera tutte le spese di un gruppo
   */
  async getExpensesByGroup(groupId: string) {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('expenses_log')
      .select('*')
      .eq('group_id', groupId);

    if (error) {
      throw new InternalServerErrorException(
        `❌ Errore nel recupero delle spese: ${error.message}`,
      );
    }

    return data;
  }

  /**
   * Recupera il bilancio tra i membri di un gruppo
   */
  async getGroupBalances(groupId: string) {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('group_balances')
      .select('payer_id, user_id, amount, currency')
      .eq('group_id', groupId);

    if (error) {
      throw new InternalServerErrorException(
        `❌ Errore nel recupero dei bilanci: ${error.message}`,
      );
    }

    return data;
  }

  /**
   * Permette a un utente di saldare un debito
   */
  async settleDebt(
    groupId: string,
    payerId: string,
    userId: string,
    amount: number,
  ) {
    const supabase = this.supabaseService.getClient();

    // 1️⃣ Controlliamo se il debito esiste
    const { data: existingDebt, error: debtError } = await supabase
      .from('group_balances')
      .select('id, amount')
      .eq('group_id', groupId)
      .eq('payer_id', payerId)
      .eq('user_id', userId)
      .maybeSingle();

    if (!existingDebt) {
      throw new NotFoundException('❌ Nessun debito trovato tra questi utenti');
    }

    // 2️⃣ Se il pagamento copre l'importo, eliminiamo il debito
    if (amount >= existingDebt.amount) {
      await supabase.from('group_balances').delete().eq('id', existingDebt.id);
    } else {
      // 3️⃣ Altrimenti, riduciamo l'importo del debito
      await supabase
        .from('group_balances')
        .update({ amount: existingDebt.amount - amount })
        .eq('id', existingDebt.id);
    }

    return { message: '✅ Debito saldato con successo!' };
  }

  async optimizePayments(groupId: string) {
    const { data: balances, error } = await this.supabaseService
      .getClient()
      .from('group_balances')
      .select('payer_id, user_id, amount')
      .eq('group_id', groupId);

    if (error) {
      throw new InternalServerErrorException(
        `❌ Errore nel recupero dei saldi: ${error.message}`,
      );
    }

    // 1️⃣ Creiamo due liste: creditori e debitori
    const debtors: { [userId: string]: number } = {};
    const creditors: { [userId: string]: number } = {};

    balances.forEach(({ payer_id, user_id, amount }) => {
      if (!debtors[user_id]) debtors[user_id] = 0;
      if (!creditors[payer_id]) creditors[payer_id] = 0;

      debtors[user_id] += amount;
      creditors[payer_id] += amount;
    });

    // 2️⃣ Convertiamo le liste in array e ordiniamo
    let debtorList = Object.entries(debtors)
      .map(([id, amount]) => ({ id, amount: -amount }))
      .filter((d) => d.amount < 0);
    let creditorList = Object.entries(creditors)
      .map(([id, amount]) => ({ id, amount }))
      .filter((c) => c.amount > 0);

    debtorList.sort((a, b) => a.amount - b.amount); // Debitori ordinati per chi deve di più
    creditorList.sort((a, b) => b.amount - a.amount); // Creditori ordinati per chi deve ricevere di più

    const transactions = [];

    // 3️⃣ Ottimizziamo i pagamenti
    while (debtorList.length > 0 && creditorList.length > 0) {
      const debtor = debtorList[0];
      const creditor = creditorList[0];

      const amountToPay = Math.min(-debtor.amount, creditor.amount);

      // @ts-ignore
      transactions.push({
        from: debtor.id,
        to: creditor.id,
        amount: amountToPay,
      });

      debtor.amount += amountToPay;
      creditor.amount -= amountToPay;

      if (debtor.amount === 0) debtorList.shift();
      if (creditor.amount === 0) creditorList.shift();
    }

    return transactions;
  }
}
