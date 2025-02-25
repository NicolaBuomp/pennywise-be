import { Injectable, ForbiddenException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class ShoppingItemsService {
  constructor(private readonly supabase: SupabaseService) {}

  async create(
    listId: string,
    name: string,
    quantity: number = 1,
    unit: string = 'pezzi',
    userId: string,
  ) {
    // Controlla se l'utente è membro del gruppo
    const { data: membership } = await this.supabase
      .getClient()
      .from('shopping_lists')
      .select('group_id')
      .eq('id', listId)
      .single();

    if (!membership) throw new ForbiddenException('Lista non trovata');

    // Aggiunge l'elemento alla lista
    const { data, error } = await this.supabase
      .getClient()
      .from('shopping_items')
      .insert([{ list_id: listId, name, quantity, unit, created_by: userId }])
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async findAll(listId: string, userId: string) {
    // Controlla se l'utente è membro del gruppo della lista
    const { data: membership } = await this.supabase
      .getClient()
      .from('shopping_lists')
      .select('group_id')
      .eq('id', listId)
      .single();

    if (!membership) throw new ForbiddenException('Lista non trovata');

    // Recupera gli elementi della lista
    const { data, error } = await this.supabase
      .getClient()
      .from('shopping_items')
      .select('*')
      .eq('list_id', listId);

    if (error) throw new Error(error.message);
    return data;
  }

  async update(
    itemId: string,
    updateData: {
      name?: string;
      quantity?: number;
      unit?: string;
      completed?: boolean;
    },
    userId: string,
  ) {
    // Controlla se l'utente è il creatore dell'elemento
    const { data: item } = await this.supabase
      .getClient()
      .from('shopping_items')
      .select('created_by, completed')
      .eq('id', itemId)
      .single();

    if (!item) throw new ForbiddenException('Elemento non trovato');

    if (updateData.completed && !item.completed) {
      updateData['completed_by'] = userId;
      updateData['completed_at'] = new Date().toISOString();
    }

    // Aggiorna l'elemento
    const { data, error } = await this.supabase
      .getClient()
      .from('shopping_items')
      .update(updateData)
      .eq('id', itemId);

    if (error) throw new Error(error.message);
    return data;
  }

  async remove(itemId: string, userId: string) {
    // Controlla se l'utente è il creatore dell'elemento
    const { data: item } = await this.supabase
      .getClient()
      .from('shopping_items')
      .select('created_by')
      .eq('id', itemId)
      .single();

    if (!item || item.created_by !== userId) {
      throw new ForbiddenException(
        'Solo il creatore può eliminare questo elemento',
      );
    }

    await this.supabase
      .getClient()
      .from('shopping_items')
      .delete()
      .eq('id', itemId);
    return { message: 'Elemento eliminato con successo' };
  }
}
