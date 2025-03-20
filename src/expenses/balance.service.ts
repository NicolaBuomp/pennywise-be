import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateSettlementDto } from './dto/settle-expense.dto';

interface DebtGraph {
  [key: string]: {
    [key: string]: number;
  };
}

@Injectable()
export class BalanceService {
  constructor(private supabaseService: SupabaseService) {}

  /**
   * Ricalcola tutti i saldi per un gruppo
   */
  async recalculateGroupBalances(groupId: string) {
    // Ottieni tutte le spese e le quote del gruppo
    const { data: expenses, error: expensesError } = await this.supabaseService
      .getClient()
      .from('expenses')
      .select(
        `
        id,
        currency,
        amount,
        paid_by,
        expense_shares (
          id,
          user_id,
          amount,
          is_settled
        )
      `,
      )
      .eq('group_id', groupId);

    if (expensesError) {
      throw new Error(
        `Errore nel recupero delle spese: ${expensesError.message}`,
      );
    }

    // Ottieni la valuta predefinita del gruppo
    const { data: group, error: groupError } = await this.supabaseService
      .getClient()
      .from('groups')
      .select('default_currency')
      .eq('id', groupId)
      .single();

    if (groupError || !group) {
      throw new NotFoundException(`Gruppo con ID ${groupId} non trovato`);
    }

    const defaultCurrency = group.default_currency || 'EUR';

    // Costruisci un grafo dei debiti (chi deve quanto a chi)
    const debtGraph: DebtGraph = {};

    // Inizializza il grafo con tutti i membri del gruppo
    const { data: members, error: membersError } = await this.supabaseService
      .getClient()
      .from('group_members')
      .select('user_id')
      .eq('group_id', groupId);

    if (membersError) {
      throw new Error(
        `Errore nel recupero dei membri: ${membersError.message}`,
      );
    }

    // Inizializza il grafo vuoto
    for (const member of members || []) {
      debtGraph[member.user_id] = {};
      for (const otherMember of members || []) {
        if (member.user_id !== otherMember.user_id) {
          debtGraph[member.user_id][otherMember.user_id] = 0;
        }
      }
    }

    // Elabora tutte le spese e le quote non saldate
    for (const expense of expenses || []) {
      const payerId = expense.paid_by;

      // Somma tutte le quote non saldate per questa spesa
      for (const share of expense.expense_shares || []) {
        if (!share.is_settled && share.user_id !== payerId) {
          // Se l'utente della quota non è il pagatore, ha un debito verso il pagatore
          debtGraph[share.user_id][payerId] += share.amount;
        }
      }
    }

    // Semplifica i debiti (rimuovi circoli)
    this.simplifyDebts(debtGraph);

    // Elimina tutti i saldi esistenti per il gruppo
    await this.supabaseService
      .getClient()
      .from('balances')
      .delete()
      .eq('group_id', groupId);

    // Crea i nuovi record di saldo
    const balancesToInsert: any[] = []; // <-- Annotazione aggiunta

    for (const fromUser in debtGraph) {
      for (const toUser in debtGraph[fromUser]) {
        const amount = debtGraph[fromUser][toUser];
        if (amount > 0) {
          balancesToInsert.push({
            group_id: groupId,
            from_user_id: fromUser,
            to_user_id: toUser,
            amount,
            currency: defaultCurrency,
            updated_at: new Date().toISOString(),
          });
        }
      }
    }

    if (balancesToInsert.length > 0) {
      const { error } = await this.supabaseService
        .getClient()
        .from('balances')
        .insert(balancesToInsert);

      if (error) {
        throw new Error(
          `Errore nell'aggiornamento dei saldi: ${error.message}`,
        );
      }
    }

    return { success: true, balancesUpdated: balancesToInsert.length };
  }

  /**
   * Semplifica i debiti per ridurre il numero di transazioni necessarie
   */
  private simplifyDebts(debtGraph: DebtGraph) {
    // Implementazione dell'algoritmo di semplificazione dei debiti
    // Cerca di eliminare i circuiti di debito (A deve a B, B deve a C, C deve a A)
    const users = Object.keys(debtGraph);

    // Per ogni tripla di utenti, verifica se esiste un circuito e semplificalo
    for (const a of users) {
      for (const b of users) {
        if (a === b) continue;

        for (const c of users) {
          if (a === c || b === c) continue;

          // Se A deve a B, B deve a C, e C deve ad A, abbiamo un circuito
          if (
            debtGraph[a][b] > 0 &&
            debtGraph[b][c] > 0 &&
            debtGraph[c][a] > 0
          ) {
            // Trova il debito minimo nel circuito
            const minDebt = Math.min(
              debtGraph[a][b],
              debtGraph[b][c],
              debtGraph[c][a],
            );

            // Riduci tutti i debiti nel circuito
            debtGraph[a][b] -= minDebt;
            debtGraph[b][c] -= minDebt;
            debtGraph[c][a] -= minDebt;
          }
        }
      }
    }

    // Arrotonda tutti i valori a due decimali per evitare problemi con numeri a virgola mobile
    for (const from in debtGraph) {
      for (const to in debtGraph[from]) {
        debtGraph[from][to] = parseFloat(debtGraph[from][to].toFixed(2));

        // Rimuovi i debiti trascurabili (minori di 0.01)
        if (Math.abs(debtGraph[from][to]) < 0.01) {
          debtGraph[from][to] = 0;
        }
      }
    }

    // Semplifica i debiti bilaterali (se A deve a B e B deve ad A)
    for (const a of users) {
      for (const b of users) {
        if (a === b) continue;

        if (debtGraph[a][b] > 0 && debtGraph[b][a] > 0) {
          // Se entrambi si devono soldi a vicenda, compensa
          if (debtGraph[a][b] >= debtGraph[b][a]) {
            debtGraph[a][b] -= debtGraph[b][a];
            debtGraph[b][a] = 0;
          } else {
            debtGraph[b][a] -= debtGraph[a][b];
            debtGraph[a][b] = 0;
          }
        }
      }
    }

    return debtGraph;
  }

  /**
   * Ottieni i saldi per un gruppo
   */
  async getGroupBalances(groupId: string, userId: string) {
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
        'Devi essere membro del gruppo per visualizzare i saldi',
      );
    }

    // Ottieni tutti i saldi del gruppo
    const { data: balances, error } = await this.supabaseService
      .getClient()
      .from('balances')
      .select(
        `
        *,
        from_user:from_user_id(id, first_name, last_name, avatar_url),
        to_user:to_user_id(id, first_name, last_name, avatar_url)
      `,
      )
      .eq('group_id', groupId);

    if (error) {
      throw new Error(`Errore nel recupero dei saldi: ${error.message}`);
    }

    // Raggruppa i saldi per utente per una visualizzazione più semplice
    const userBalances = {};

    // Ottieni tutti i membri del gruppo per includerli anche se non hanno saldi
    const { data: members, error: membersError } = await this.supabaseService
      .getClient()
      .from('group_members')
      .select(
        `
        user_id,
        user:user_id(id, first_name, last_name, avatar_url)
      `,
      )
      .eq('group_id', groupId);

    if (membersError) {
      throw new Error(
        `Errore nel recupero dei membri: ${membersError.message}`,
      );
    }

    // Inizializza l'oggetto con tutti i membri e aggiungi display_name
    for (const member of members || []) {
      const user = member.user && member.user[0];
      userBalances[member.user_id] = {
        user: user
          ? {
              ...user,
              display_name:
                user.first_name && user.last_name
                  ? `${user.first_name} ${user.last_name}`
                  : 'Utente sconosciuto',
            }
          : null,
        owes: [],
        isOwed: [],
        totalOwing: 0,
        totalOwed: 0,
        netBalance: 0,
      };
    }

    // Popola i saldi per ogni utente
    for (const balance of balances || []) {
      // Aggiungi display_name ai from_user e to_user
      const fromUser =
        balance.from_user && balance.from_user[0]
          ? {
              ...balance.from_user[0],
              display_name:
                balance.from_user[0].first_name &&
                balance.from_user[0].last_name
                  ? `${balance.from_user[0].first_name} ${balance.from_user[0].last_name}`
                  : 'Utente sconosciuto',
            }
          : null;

      const toUser =
        balance.to_user && balance.to_user[0]
          ? {
              ...balance.to_user[0],
              display_name:
                balance.to_user[0].first_name && balance.to_user[0].last_name
                  ? `${balance.to_user[0].first_name} ${balance.to_user[0].last_name}`
                  : 'Utente sconosciuto',
            }
          : null;

      // Aggiungi al debitore (chi deve)
      if (userBalances[balance.from_user_id]) {
        userBalances[balance.from_user_id].owes.push({
          user: toUser,
          amount: balance.amount,
          currency: balance.currency,
        });
        userBalances[balance.from_user_id].totalOwing += balance.amount;
        userBalances[balance.from_user_id].netBalance -= balance.amount;
      }

      // Aggiungi al creditore (a chi è dovuto)
      if (userBalances[balance.to_user_id]) {
        userBalances[balance.to_user_id].isOwed.push({
          user: fromUser,
          amount: balance.amount,
          currency: balance.currency,
        });
        userBalances[balance.to_user_id].totalOwed += balance.amount;
        userBalances[balance.to_user_id].netBalance += balance.amount;
      }
    }

    // Converti in array per il frontend
    const balancesArray = Object.values(userBalances);

    return {
      balances: balancesArray,
      userBalance: userBalances[userId] || null,
      lastUpdated:
        balances && balances.length > 0
          ? balances[0].updated_at
          : new Date().toISOString(),
    };
  }

  /**
   * Ottieni i saldi specifici di un utente nel gruppo
   */
  async getUserBalanceInGroup(groupId: string, userId: string) {
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
        'Devi essere membro del gruppo per visualizzare i saldi',
      );
    }

    // Ottieni i debiti dell'utente (quanto deve agli altri)
    const { data: owes, error: owesError } = await this.supabaseService
      .getClient()
      .from('balances')
      .select(
        `
        amount,
        currency,
        to_user:to_user_id(id, first_name, last_name, avatar_url)
      `,
      )
      .eq('group_id', groupId)
      .eq('from_user_id', userId);

    if (owesError) {
      throw new Error(`Errore nel recupero dei debiti: ${owesError.message}`);
    }

    // Ottieni i crediti dell'utente (quanto gli è dovuto)
    const { data: isOwed, error: isOwedError } = await this.supabaseService
      .getClient()
      .from('balances')
      .select(
        `
        amount,
        currency,
        from_user:from_user_id(id, first_name, last_name, avatar_url)
      `,
      )
      .eq('group_id', groupId)
      .eq('to_user_id', userId);

    if (isOwedError) {
      throw new Error(
        `Errore nel recupero dei crediti: ${isOwedError.message}`,
      );
    }

    // Formatta i risultati per includere display_name
    const formattedOwes = (owes || []).map((owe) => {
      const toUser = owe.to_user && owe.to_user[0];
      return {
        ...owe,
        to_user: toUser
          ? {
              ...toUser,
              display_name:
                toUser.first_name && toUser.last_name
                  ? `${toUser.first_name} ${toUser.last_name}`
                  : 'Utente sconosciuto',
            }
          : null,
      };
    });

    const formattedIsOwed = (isOwed || []).map((owed) => {
      const fromUser = owed.from_user && owed.from_user[0];
      return {
        ...owed,
        from_user: fromUser
          ? {
              ...fromUser,
              display_name:
                fromUser.first_name && fromUser.last_name
                  ? `${fromUser.first_name} ${fromUser.last_name}`
                  : 'Utente sconosciuto',
            }
          : null,
      };
    });

    // Calcola i totali
    const totalOwing = formattedOwes.reduce(
      (sum, balance) => sum + balance.amount,
      0,
    );
    const totalOwed = formattedIsOwed.reduce(
      (sum, balance) => sum + balance.amount,
      0,
    );
    const netBalance = totalOwed - totalOwing;

    // Ottieni i dati dell'utente
    const { data: user, error: userError } = await this.supabaseService
      .getClient()
      .from('users')
      .select('id, first_name, last_name, avatar_url')
      .eq('id', userId)
      .single();

    if (userError) {
      throw new Error(`Errore nel recupero dell'utente: ${userError.message}`);
    }

    // Aggiungi display_name
    const formattedUser = user
      ? {
          ...user,
          display_name:
            user.first_name && user.last_name
              ? `${user.first_name} ${user.last_name}`
              : 'Utente sconosciuto',
        }
      : null;

    return {
      user: formattedUser,
      owes: formattedOwes,
      isOwed: formattedIsOwed,
      totalOwing,
      totalOwed,
      netBalance,
    };
  }

  /**
   * Registra un pagamento tra utenti
   */
  async createSettlement(
    groupId: string,
    createSettlementDto: CreateSettlementDto,
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
        'Devi essere membro del gruppo per registrare un pagamento',
      );
    }

    // Verifica che l'utente sia coinvolto nel pagamento (come pagante o ricevente)
    if (
      userId !== createSettlementDto.from_user_id &&
      userId !== createSettlementDto.to_user_id
    ) {
      throw new ForbiddenException(
        'Puoi registrare solo pagamenti che ti coinvolgono direttamente',
      );
    }

    // Crea il pagamento
    const { data: settlement, error } = await this.supabaseService
      .getClient()
      .from('settlements')
      .insert({
        group_id: groupId,
        from_user_id: createSettlementDto.from_user_id,
        to_user_id: createSettlementDto.to_user_id,
        amount: createSettlementDto.amount,
        currency: createSettlementDto.currency || 'EUR',
        date: new Date().toISOString(),
        notes: createSettlementDto.notes,
      })
      .select()
      .single();

    if (error) {
      throw new Error(
        `Errore nella registrazione del pagamento: ${error.message}`,
      );
    }

    // Aggiorna il saldo tra gli utenti
    const { data: balance, error: balanceError } = await this.supabaseService
      .getClient()
      .from('balances')
      .select('id, amount')
      .eq('group_id', groupId)
      .eq('from_user_id', createSettlementDto.from_user_id)
      .eq('to_user_id', createSettlementDto.to_user_id)
      .maybeSingle();

    if (balanceError) {
      throw new Error(
        `Errore nel controllo del saldo: ${balanceError.message}`,
      );
    }

    if (balance) {
      // Aggiorna il saldo esistente
      const newAmount = Math.max(
        0,
        balance.amount - createSettlementDto.amount,
      );

      if (newAmount > 0) {
        // Se c'è ancora un debito residuo, aggiorna l'importo
        await this.supabaseService
          .getClient()
          .from('balances')
          .update({
            amount: newAmount,
            updated_at: new Date().toISOString(),
          })
          .eq('id', balance.id);
      } else {
        // Se il debito è stato completamente saldato, rimuovi il record
        await this.supabaseService
          .getClient()
          .from('balances')
          .delete()
          .eq('id', balance.id);
      }
    }

    return {
      success: true,
      message: 'Pagamento registrato con successo',
      settlement,
    };
  }

  /**
   * Ottieni tutti i pagamenti per un gruppo
   */
  async getGroupSettlements(groupId: string, userId: string) {
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
        'Devi essere membro del gruppo per visualizzare i pagamenti',
      );
    }

    // Ottieni tutti i pagamenti del gruppo
    const { data: settlements, error } = await this.supabaseService
      .getClient()
      .from('settlements')
      .select(
        `
        *,
        from_user:from_user_id(id, display_name, avatar_url),
        to_user:to_user_id(id, display_name, avatar_url)
      `,
      )
      .eq('group_id', groupId)
      .order('date', { ascending: false });

    if (error) {
      throw new Error(`Errore nel recupero dei pagamenti: ${error.message}`);
    }

    return settlements || [];
  }

  /**
   * Ottieni i pagamenti dell'utente in un gruppo
   */
  async getUserSettlementsInGroup(groupId: string, userId: string) {
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
        'Devi essere membro del gruppo per visualizzare i pagamenti',
      );
    }

    // Ottieni i pagamenti effettuati dall'utente
    const { data: outgoingSettlements, error: outgoingError } =
      await this.supabaseService
        .getClient()
        .from('settlements')
        .select(
          `
        *,
        to_user:to_user_id(id, display_name, avatar_url)
      `,
        )
        .eq('group_id', groupId)
        .eq('from_user_id', userId)
        .order('date', { ascending: false });

    if (outgoingError) {
      throw new Error(
        `Errore nel recupero dei pagamenti effettuati: ${outgoingError.message}`,
      );
    }

    // Ottieni i pagamenti ricevuti dall'utente
    const { data: incomingSettlements, error: incomingError } =
      await this.supabaseService
        .getClient()
        .from('settlements')
        .select(
          `
        *,
        from_user:from_user_id(id, display_name, avatar_url)
      `,
        )
        .eq('group_id', groupId)
        .eq('to_user_id', userId)
        .order('date', { ascending: false });

    if (incomingError) {
      throw new Error(
        `Errore nel recupero dei pagamenti ricevuti: ${incomingError.message}`,
      );
    }

    return {
      outgoing: outgoingSettlements || [],
      incoming: incomingSettlements || [],
    };
  }
}
