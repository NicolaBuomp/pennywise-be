import {
  Injectable,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class ShoppingItemsService {
  constructor(private readonly supabase: SupabaseService) {}

  async create(
    listId: string,
    name: string,
    quantity: number = 1,
    userId: string,
  ) {
    const { data: membership, error: membershipError } = await this.supabase
      .getClient()
      .from('shopping_lists')
      .select('group_id')
      .eq('id', listId)
      .single();

    if (membershipError || !membership)
      throw new ForbiddenException('Lista non trovata');

    const { data, error } = await this.supabase
      .getClient()
      .from('shopping_list_items')
      .insert([
        {
          shopping_list_id: listId,
          name,
          quantity,
          created_by: userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .single();

    if (error)
      throw new InternalServerErrorException(
        `Errore nella creazione dell'elemento`,
      );
    return data;
  }

  async findAll(listId: string, userId: string) {
    const { data: membership, error: membershipError } = await this.supabase
      .getClient()
      .from('shopping_lists')
      .select('group_id')
      .eq('id', listId)
      .single();

    if (membershipError || !membership)
      throw new ForbiddenException('Lista non trovata');

    const { data, error } = await this.supabase
      .getClient()
      .from('shopping_list_items')
      .select('*')
      .eq('shopping_list_id', listId);

    if (error)
      throw new InternalServerErrorException(
        'Errore nel recupero degli elementi',
      );
    return data;
  }

  async update(
    itemId: string,
    updateData: { name?: string; quantity?: number; completed?: boolean },
    userId: string,
  ) {
    // Controlliamo se l'utente ha accesso alla lista dell'elemento
    const { data: item, error } = await this.supabase
      .getClient()
      .from('shopping_list_items')
      .select('shopping_list_id, created_by, completed')
      .eq('id', itemId)
      .single();

    if (error || !item) throw new ForbiddenException('Elemento non trovato');

    // Controlliamo se l'utente ha accesso alla lista
    const { data: list } = await this.supabase
      .getClient()
      .from('shopping_lists')
      .select('group_id')
      .eq('id', item.shopping_list_id)
      .single();

    if (!list) {
      throw new ForbiddenException('Lista non trovata');
    }

    const { data: membership } = await this.supabase
      .getClient()
      .from('group_members')
      .select('id')
      .eq('group_id', list.group_id)
      .eq('user_id', userId)
      .single();

    if (!membership)
      throw new ForbiddenException('Non hai accesso a questa lista');

    if (updateData.completed && !item.completed) {
      updateData['assigned_to'] = userId;
      updateData['completed_at'] = new Date().toISOString();
    }

    // Aggiorniamo l'elemento
    const { error: updateError } = await this.supabase
      .getClient()
      .from('shopping_list_items')
      .update(updateData)
      .eq('id', itemId);

    if (updateError)
      throw new InternalServerErrorException(
        "Errore nell'aggiornamento dell'elemento",
      );

    return { message: 'Elemento aggiornato con successo' };
  }

  async remove(itemId: string, userId: string) {
    const { data: item, error } = await this.supabase
      .getClient()
      .from('shopping_list_items')
      .select('created_by')
      .eq('id', itemId)
      .single();

    if (error || !item || item.created_by !== userId) {
      throw new ForbiddenException(
        'Solo il creatore può eliminare questo elemento',
      );
    }

    const { error: deleteError } = await this.supabase
      .getClient()
      .from('shopping_list_items')
      .delete()
      .eq('id', itemId);

    if (deleteError)
      throw new InternalServerErrorException(
        `Errore nell'eliminazione dell'elemento`,
      );
    return { message: 'Elemento eliminato con successo' };
  }
}
