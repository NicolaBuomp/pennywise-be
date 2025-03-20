import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ExpenseFilterDto } from './dto/expense-filter.dto';
import { ExpenseSharesService } from './expense-shares.service';
import { BalanceService } from './balance.service';

@Injectable()
export class ExpensesService {
  constructor(
    private supabaseService: SupabaseService,
    private expenseSharesService: ExpenseSharesService,
    private balanceService: BalanceService,
  ) {}

  /**
   * Crea una nuova spesa nel gruppo
   */
  async create(
    groupId: string,
    createExpenseDto: CreateExpenseDto,
    userId: string,
  ) {
    // Aggiungi validazione importo
    if (createExpenseDto.amount <= 0) {
      throw new BadRequestException("L'importo deve essere maggiore di zero");
    }

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
        'Devi essere membro del gruppo per aggiungere spese',
      );
    }

    // Formatta importo e data
    const formattedAmount = parseFloat(createExpenseDto.amount.toFixed(2));
    const formattedDate = createExpenseDto.date
      ? new Date(createExpenseDto.date).toISOString()
      : new Date().toISOString();

    // Crea la spesa
    const { data: expense, error } = await this.supabaseService
      .getClient()
      .from('expenses')
      .insert({
        group_id: groupId,
        description: createExpenseDto.description,
        amount: formattedAmount,
        currency: createExpenseDto.currency || 'EUR',
        category_id: createExpenseDto.category_id,
        date: formattedDate,
        paid_by: createExpenseDto.paid_by,
        recurring_expense_id: createExpenseDto.recurring_expense_id,
        receipt_url: createExpenseDto.receipt_url,
        notes: createExpenseDto.notes,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Errore nella creazione della spesa: ${error.message}`);
    }

    // Se non sono specificati i partecipanti, ottieni tutti i membri del gruppo
    const participants = createExpenseDto.participants || [];
    if (participants.length === 0) {
      const { data: groupMembers, error: groupMembersError } =
        await this.supabaseService
          .getClient()
          .from('group_members')
          .select('user_id')
          .eq('group_id', groupId);

      if (groupMembersError) {
        throw new Error(
          `Errore nel recupero dei membri del gruppo: ${groupMembersError.message}`,
        );
      }

      for (const member of groupMembers || []) {
        participants.push({ user_id: member.user_id });
      }
    }

    // Crea le quote di spesa in base al tipo di suddivisione
    const splitType = createExpenseDto.split_type || 'equal';
    const sharesToInsert: any[] = [];

    switch (splitType) {
      case 'equal':
        // Divisione equa tra tutti i partecipanti
        const equalShare = formattedAmount / participants.length;

        for (const participant of participants) {
          sharesToInsert.push({
            expense_id: expense.id,
            user_id: participant.user_id,
            amount: parseFloat(equalShare.toFixed(2)),
            is_settled: participant.user_id === createExpenseDto.paid_by,
            settled_at:
              participant.user_id === createExpenseDto.paid_by
                ? new Date().toISOString()
                : null,
          });
        }
        break;

      case 'percentage':
        // Verifica che la somma delle percentuali sia 100%
        const totalPercentage = participants.reduce(
          (sum, p) => sum + (p.percentage ?? 0),
          0,
        );

        if (Math.abs(totalPercentage - 100) > 0.01) {
          throw new BadRequestException(
            'La somma delle percentuali deve essere 100%',
          );
        }

        for (const participant of participants) {
          if (participant.percentage == null) {
            throw new BadRequestException(
              'Percentuale mancante per uno o più partecipanti',
            );
          }

          const shareAmt = parseFloat(
            ((formattedAmount * participant.percentage) / 100).toFixed(2),
          );
          sharesToInsert.push({
            expense_id: expense.id,
            user_id: participant.user_id,
            amount: shareAmt,
            percentage: participant.percentage,
            is_settled: participant.user_id === createExpenseDto.paid_by,
            settled_at:
              participant.user_id === createExpenseDto.paid_by
                ? new Date().toISOString()
                : null,
          });
        }
        break;

      case 'custom':
        // Verifica che l'importo totale specificato corrisponda all'importo totale della spesa
        const totalCustomAmount = participants.reduce(
          (sum, p) => sum + (p.amount ?? 0),
          0,
        );

        if (Math.abs(totalCustomAmount - formattedAmount) > 0.01) {
          throw new BadRequestException(
            "La somma degli importi personalizzati deve corrispondere all'importo totale",
          );
        }

        for (const participant of participants) {
          if (participant.amount == null) {
            throw new BadRequestException(
              'Importo mancante per uno o più partecipanti',
            );
          }

          sharesToInsert.push({
            expense_id: expense.id,
            user_id: participant.user_id,
            amount: parseFloat(participant.amount.toFixed(2)),
            is_settled: participant.user_id === createExpenseDto.paid_by,
            settled_at:
              participant.user_id === createExpenseDto.paid_by
                ? new Date().toISOString()
                : null,
          });
        }
        break;
    }

    // Inserisci tutte le quote
    if (sharesToInsert.length > 0) {
      const { error: sharesError } = await this.supabaseService
        .getClient()
        .from('expense_shares')
        .insert(sharesToInsert);

      if (sharesError) {
        throw new Error(
          `Errore nell'inserimento delle quote: ${sharesError.message}`,
        );
      }
    }

    // Ricalcola i saldi del gruppo
    await this.balanceService.recalculateGroupBalances(groupId);

    return expense;
  }

  /**
   * Trova tutte le spese di un gruppo con filtri opzionali
   */
  async findAll(groupId: string, userId: string, filterDto: ExpenseFilterDto) {
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
        'Devi essere membro del gruppo per visualizzare le spese',
      );
    }

    // Estrai parametri di filtro con valori di default
    const {
      category_id,
      paid_by,
      startDate,
      endDate,
      sortBy = 'date',
      sortDir = 'desc',
      page = 1,
      limit = 10,
    } = filterDto;

    // Costruisci la query di base
    let query = this.supabaseService
      .getClient()
      .from('expenses')
      .select(
        `
        *,
        payer:paid_by(id, first_name, last_name, avatar_url),
        category:category_id(id, name, color, icon),
        expense_shares(
          id, 
          user_id, 
          amount, 
          percentage, 
          is_settled,
          settled_at,
          user:user_id(id, first_name, last_name, avatar_url)
        )
      `,
        { count: 'exact' },
      )
      .eq('group_id', groupId);

    // Applica i filtri
    if (category_id) {
      query = query.eq('category_id', category_id);
    }

    if (paid_by) {
      query = query.eq('paid_by', paid_by);
    }

    if (startDate) {
      query = query.gte('date', startDate.toISOString());
    }

    if (endDate) {
      query = query.lte('date', endDate.toISOString());
    }

    // Ottieni il conteggio totale
    const { count } = await query;
    const totalCount = count || 0;

    // Applica ordinamento
    switch (sortBy) {
      case 'date':
        query = query.order('date', { ascending: sortDir === 'asc' });
        break;
      case 'amount':
        query = query.order('amount', { ascending: sortDir === 'asc' });
        break;
      default:
        query = query.order('date', { ascending: false });
    }

    // Applica paginazione
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    // Esegui la query
    const { data: expenses, error } = await query;

    if (error) {
      throw new Error(`Errore nel recupero delle spese: ${error.message}`);
    }

    return {
      data: expenses || [],
      meta: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  /**
   * Trova una spesa specifica per ID
   */
  async findOne(groupId: string, expenseId: string, userId: string) {
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
        'Devi essere membro del gruppo per visualizzare le spese',
      );
    }

    // Ottieni la spesa con tutte le quote
    const { data: expense, error } = await this.supabaseService
      .getClient()
      .from('expenses')
      .select(
        `
        *,
        payer:paid_by(id, first_name, last_name, avatar_url),
        category:category_id(id, name, color, icon),
        expense_shares(
          id, 
          user_id, 
          amount, 
          percentage, 
          is_settled, 
          settled_at,
          user:user_id(id, first_name, last_name, avatar_url)
        ),
        group:group_id(name, avatar_url)
      `,
      )
      .eq('id', expenseId)
      .eq('group_id', groupId)
      .single();

    if (error || !expense) {
      throw new NotFoundException(`Spesa con ID ${expenseId} non trovata`);
    }

    // Formatta i risultati per includere un nome visualizzato per il pagatore e gli utenti delle quote
    const formattedExpense = {
      ...expense,
      payer:
        expense.payer && expense.payer[0]
          ? {
              ...expense.payer[0],
              display_name:
                expense.payer[0].first_name && expense.payer[0].last_name
                  ? `${expense.payer[0].first_name} ${expense.payer[0].last_name}`
                  : 'Utente sconosciuto',
            }
          : null,
      expense_shares: (expense.expense_shares || []).map((share) => {
        const user = share.user && share.user[0];
        return {
          ...share,
          user: user
            ? {
                ...user,
                display_name:
                  user.first_name && user.last_name
                    ? `${user.first_name} ${user.last_name}`
                    : 'Utente sconosciuto',
              }
            : null,
        };
      }),
    };

    return formattedExpense;
  }

  /**
   * Aggiorna una spesa esistente
   */
  async update(
    groupId: string,
    expenseId: string,
    updateExpenseDto: UpdateExpenseDto,
    userId: string,
  ) {
    // Prima controlla se la spesa esiste e appartiene al gruppo
    const { data: existingExpense, error: expenseError } =
      await this.supabaseService
        .getClient()
        .from('expenses')
        .select()
        .eq('id', expenseId)
        .eq('group_id', groupId)
        .single();

    if (expenseError || !existingExpense) {
      throw new NotFoundException(`Spesa con ID ${expenseId} non trovata`);
    }

    // Verifica che l'utente sia chi ha pagato o un admin del gruppo
    const { data: membership, error: membershipError } =
      await this.supabaseService
        .getClient()
        .from('group_members')
        .select('role')
        .eq('group_id', groupId)
        .eq('user_id', userId)
        .maybeSingle();

    if (
      !membership ||
      (membership.role !== 'admin' && existingExpense.paid_by !== userId)
    ) {
      throw new ForbiddenException(
        'Solo chi ha pagato la spesa o gli amministratori del gruppo possono modificarla',
      );
    }

    // Controlla se ci sono quote già saldate
    const { data: settledShares, error: sharesError } =
      await this.supabaseService
        .getClient()
        .from('expense_shares')
        .select('id')
        .eq('expense_id', expenseId)
        .eq('is_settled', true);

    if (sharesError) {
      throw new Error(
        `Errore nel controllo delle quote: ${sharesError.message}`,
      );
    }

    if (settledShares && settledShares.length > 0) {
      // Se ci sono quote saldate, consenti solo di aggiornare campi che non influenzano il calcolo
      const { data: updatedExpense, error } = await this.supabaseService
        .getClient()
        .from('expenses')
        .update({
          description: updateExpenseDto.description,
          category_id: updateExpenseDto.category_id,
          date: updateExpenseDto.date
            ? new Date(updateExpenseDto.date).toISOString()
            : undefined,
          receipt_url: updateExpenseDto.receipt_url,
          notes: updateExpenseDto.notes,
        })
        .eq('id', expenseId)
        .select()
        .single();

      if (error) {
        throw new Error(
          `Errore nell'aggiornamento della spesa: ${error.message}`,
        );
      }

      return updatedExpense;
    } else {
      // Se non ci sono quote saldate, consenti di aggiornare tutti i campi
      let formattedAmount;
      if (updateExpenseDto.amount !== undefined) {
        if (updateExpenseDto.amount <= 0) {
          throw new BadRequestException(
            "L'importo deve essere maggiore di zero",
          );
        }
        formattedAmount = parseFloat(updateExpenseDto.amount.toFixed(2));
      }

      const { data: updatedExpense, error } = await this.supabaseService
        .getClient()
        .from('expenses')
        .update({
          description: updateExpenseDto.description,
          amount: formattedAmount,
          currency: updateExpenseDto.currency,
          category_id: updateExpenseDto.category_id,
          date: updateExpenseDto.date
            ? new Date(updateExpenseDto.date).toISOString()
            : undefined,
          paid_by: updateExpenseDto.paid_by,
          receipt_url: updateExpenseDto.receipt_url,
          notes: updateExpenseDto.notes,
        })
        .eq('id', expenseId)
        .select()
        .single();

      if (error) {
        throw new Error(
          `Errore nell'aggiornamento della spesa: ${error.message}`,
        );
      }

      // Se l'importo è cambiato, aggiorna anche le quote
      if (
        updateExpenseDto.amount &&
        updateExpenseDto.amount !== existingExpense.amount
      ) {
        // Rimuovi tutte le quote esistenti
        await this.supabaseService
          .getClient()
          .from('expense_shares')
          .delete()
          .eq('expense_id', expenseId);

        // Ricrea le quote se sono stati specificati i partecipanti
        if (
          updateExpenseDto.participants &&
          updateExpenseDto.participants.length > 0
        ) {
          const splitType = updateExpenseDto.split_type || 'equal';
          const sharesToInsert: any[] = [];
          const participants = updateExpenseDto.participants;

          // Logica di suddivisione simile a quella nel metodo create
          switch (splitType) {
            case 'equal':
              const equalShare = formattedAmount / participants.length;

              for (const participant of participants) {
                sharesToInsert.push({
                  expense_id: expenseId,
                  user_id: participant.user_id,
                  amount: parseFloat(equalShare.toFixed(2)),
                  is_settled: participant.user_id === updateExpenseDto.paid_by,
                  settled_at:
                    participant.user_id === updateExpenseDto.paid_by
                      ? new Date().toISOString()
                      : null,
                });
              }
              break;

            case 'percentage':
              const totalPercentage = participants.reduce(
                (sum, p) => sum + (p.percentage ?? 0),
                0,
              );

              if (Math.abs(totalPercentage - 100) > 0.01) {
                throw new BadRequestException(
                  'La somma delle percentuali deve essere 100%',
                );
              }

              for (const participant of participants) {
                if (participant.percentage == null) {
                  throw new BadRequestException(
                    'Percentuale mancante per uno o più partecipanti',
                  );
                }

                const shareAmt = parseFloat(
                  ((formattedAmount * participant.percentage) / 100).toFixed(2),
                );
                sharesToInsert.push({
                  expense_id: expenseId,
                  user_id: participant.user_id,
                  amount: shareAmt,
                  percentage: participant.percentage,
                  is_settled: participant.user_id === updateExpenseDto.paid_by,
                  settled_at:
                    participant.user_id === updateExpenseDto.paid_by
                      ? new Date().toISOString()
                      : null,
                });
              }
              break;

            case 'custom':
              const totalCustomAmount = participants.reduce(
                (sum, p) => sum + (p.amount ?? 0),
                0,
              );

              if (Math.abs(totalCustomAmount - formattedAmount) > 0.01) {
                throw new BadRequestException(
                  "La somma degli importi personalizzati deve corrispondere all'importo totale",
                );
              }

              for (const participant of participants) {
                if (participant.amount == null) {
                  throw new BadRequestException(
                    'Importo mancante per uno o più partecipanti',
                  );
                }

                sharesToInsert.push({
                  expense_id: expenseId,
                  user_id: participant.user_id,
                  amount: parseFloat(participant.amount.toFixed(2)),
                  is_settled: participant.user_id === updateExpenseDto.paid_by,
                  settled_at:
                    participant.user_id === updateExpenseDto.paid_by
                      ? new Date().toISOString()
                      : null,
                });
              }
              break;
          }

          // Inserisci le nuove quote
          if (sharesToInsert.length > 0) {
            await this.supabaseService
              .getClient()
              .from('expense_shares')
              .insert(sharesToInsert);
          }
        } else {
          // Se non sono stati specificati partecipanti, ricrea le quote equamente tra tutti i membri
          const { data: groupMembers } = await this.supabaseService
            .getClient()
            .from('group_members')
            .select('user_id')
            .eq('group_id', groupId);

          if (groupMembers && groupMembers.length > 0) {
            const equalShare = formattedAmount / groupMembers.length;
            const sharesToInsert = groupMembers.map((member) => ({
              expense_id: expenseId,
              user_id: member.user_id,
              amount: parseFloat(equalShare.toFixed(2)),
              is_settled: member.user_id === updateExpenseDto.paid_by,
              settled_at:
                member.user_id === updateExpenseDto.paid_by
                  ? new Date().toISOString()
                  : null,
            }));

            await this.supabaseService
              .getClient()
              .from('expense_shares')
              .insert(sharesToInsert);
          }
        }

        // Ricalcola i saldi del gruppo
        await this.balanceService.recalculateGroupBalances(groupId);
      }

      return updatedExpense;
    }
  }

  /**
   * Elimina una spesa e tutte le sue quote
   */
  async remove(groupId: string, expenseId: string, userId: string) {
    // Prima controlla se la spesa esiste e appartiene al gruppo
    const { data: existingExpense, error: expenseError } =
      await this.supabaseService
        .getClient()
        .from('expenses')
        .select()
        .eq('id', expenseId)
        .eq('group_id', groupId)
        .single();

    if (expenseError || !existingExpense) {
      throw new NotFoundException(`Spesa con ID ${expenseId} non trovata`);
    }

    // Verifica che l'utente sia chi ha pagato o un admin del gruppo
    const { data: membership, error: membershipError } =
      await this.supabaseService
        .getClient()
        .from('group_members')
        .select('role')
        .eq('group_id', groupId)
        .eq('user_id', userId)
        .maybeSingle();

    if (
      !membership ||
      (membership.role !== 'admin' && existingExpense.paid_by !== userId)
    ) {
      throw new ForbiddenException(
        'Solo chi ha pagato la spesa o gli amministratori del gruppo possono eliminarla',
      );
    }

    // Controlla se ci sono quote già saldate
    const { data: settledShares, error: sharesError } =
      await this.supabaseService
        .getClient()
        .from('expense_shares')
        .select('id')
        .eq('expense_id', expenseId)
        .eq('is_settled', true);

    if (sharesError) {
      throw new Error(
        `Errore nel controllo delle quote: ${sharesError.message}`,
      );
    }

    // Se ci sono quote saldate, non permettere l'eliminazione
    if (
      settledShares &&
      settledShares.length > 0 &&
      membership.role !== 'admin'
    ) {
      throw new ForbiddenException(
        "Non è possibile eliminare una spesa con quote già saldate (solo gli admin possono forzare l'eliminazione)",
      );
    }

    // Elimina la spesa (le foreign key con ON DELETE CASCADE si occuperanno delle quote)
    const { error } = await this.supabaseService
      .getClient()
      .from('expenses')
      .delete()
      .eq('id', expenseId);

    if (error) {
      throw new Error(`Errore nell'eliminazione della spesa: ${error.message}`);
    }

    // Ricalcola i saldi del gruppo
    await this.balanceService.recalculateGroupBalances(groupId);

    return {
      success: true,
      message: 'Spesa eliminata con successo',
    };
  }

  /**
   * Ottieni un riepilogo delle spese per categoria in un periodo
   */
  async getExpenseSummary(
    groupId: string,
    userId: string,
    startDate?: Date,
    endDate?: Date,
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
        'Devi essere membro del gruppo per visualizzare le statistiche',
      );
    }

    // Ottieni spese per categoria
    let categoryQuery = this.supabaseService
      .getClient()
      .from('expenses')
      .select('id, amount, date, category:category_id(id, name, color)')
      .eq('group_id', groupId)
      .not('category_id', 'is', null);

    // Ottieni spese senza categoria
    let uncategorizedQuery = this.supabaseService
      .getClient()
      .from('expenses')
      .select('id, amount, date')
      .eq('group_id', groupId)
      .is('category_id', null);

    // Applica filtri di data
    if (startDate) {
      categoryQuery = categoryQuery.gte('date', startDate.toISOString());
      uncategorizedQuery = uncategorizedQuery.gte(
        'date',
        startDate.toISOString(),
      );
    }

    if (endDate) {
      categoryQuery = categoryQuery.lte('date', endDate.toISOString());
      uncategorizedQuery = uncategorizedQuery.lte(
        'date',
        endDate.toISOString(),
      );
    }

    // Esegui entrambe le query
    const [categorizedResult, uncategorizedResult] = await Promise.all([
      categoryQuery,
      uncategorizedQuery,
    ]);

    if (categorizedResult.error) {
      throw new Error(
        `Errore nel recupero delle spese categorizzate: ${categorizedResult.error.message}`,
      );
    }

    if (uncategorizedResult.error) {
      throw new Error(
        `Errore nel recupero delle spese non categorizzate: ${uncategorizedResult.error.message}`,
      );
    }

    const categorizedExpenses = categorizedResult.data || [];
    const uncategorizedExpenses = uncategorizedResult.data || [];

    // Calcola totali per categoria
    const categoryTotals = {};
    let totalAmount = 0;

    // Elabora spese con categoria
    categorizedExpenses.forEach((expense) => {
      if (
        expense.category &&
        Array.isArray(expense.category) &&
        expense.category.length > 0 &&
        expense.category[0].id
      ) {
        const categoryId = expense.category[0].id;

        if (!categoryTotals[categoryId]) {
          categoryTotals[categoryId] = {
            id: categoryId,
            name: expense.category[0].name,
            color: expense.category[0].color,
            amount: 0,
          };
        }

        categoryTotals[categoryId].amount += expense.amount;
        totalAmount += expense.amount;
      }
    });

    // Aggiungi le spese non categorizzate
    if (uncategorizedExpenses.length > 0) {
      const uncategorizedTotal = uncategorizedExpenses.reduce(
        (sum, expense) => sum + expense.amount,
        0,
      );
      categoryTotals['uncategorized'] = {
        id: 'uncategorized',
        name: 'Non categorizzato',
        color: '#CCCCCC',
        amount: uncategorizedTotal,
      };
      totalAmount += uncategorizedTotal;
    }

    // Converti in array per il frontend e calcola le percentuali
    const summaryByCategory = Object.values(categoryTotals).map(
      (category: any) => ({
        ...category,
        percentage: totalAmount > 0 ? (category.amount / totalAmount) * 100 : 0,
      }),
    );

    // Calcola totali per mese
    const allExpenses = [...categorizedExpenses, ...uncategorizedExpenses];
    const monthlyTotals = {};

    allExpenses.forEach((expense) => {
      const date = new Date(expense.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!monthlyTotals[monthKey]) {
        monthlyTotals[monthKey] = 0;
      }
      monthlyTotals[monthKey] += expense.amount;
    });

    // Converti in array ordinato per data
    const summaryByMonth = Object.entries(monthlyTotals)
      .map(([month, amount]) => ({
        month,
        amount,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return {
      totalAmount,
      summaryByCategory,
      summaryByMonth,
      expenseCount: allExpenses.length,
      period: {
        startDate: startDate?.toISOString() || null,
        endDate: endDate?.toISOString() || null,
      },
    };
  }
}
