import { Injectable, ForbiddenException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class ShoppingListService {
  constructor(private readonly supabase: SupabaseService) {}

  async create(groupId: string, name: string, userId: string) {
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

    // Crea la lista della spesa
    const { data, error } = await this.supabase
      .getClient()
      .from('shopping_lists')
      .insert([{ group_id: groupId, name, created_by: userId }])
      .single();

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

    // Recupera le liste della spesa
    const { data, error } = await this.supabase
      .getClient()
      .from('shopping_lists')
      .select('*')
      .eq('group_id', groupId);

    if (error) throw new Error(error.message);
    return data;
  }

  async updateName(listId: string, newName: string, userId: string) {
    // Controlla se l'utente è il creatore della lista
    const { data } = await this.supabase
      .getClient()
      .from('shopping_lists')
      .select('created_by')
      .eq('id', listId)
      .single();

    if (!data || data.created_by !== userId) {
      throw new ForbiddenException(
        'Solo il creatore può rinominare questa lista',
      );
    }

    // Aggiorna il nome della lista
    const { error } = await this.supabase
      .getClient()
      .from('shopping_lists')
      .update({ name: newName })
      .eq('id', listId);

    if (error) throw new Error(error.message);
    return { message: 'Nome della lista aggiornato con successo' };
  }

  async remove(listId: string, userId: string) {
    // Controlla quanti elementi sono presenti nella lista
    const { data: items } = await this.supabase
      .getClient()
      .from('shopping_items')
      .select('id')
      .eq('list_id', listId);

    if (!items || items.length === 0) {
      return { message: 'Nessun elemento nella lista' };
    }

    // Se la lista ha elementi, solo un admin può eliminarla
    if (items.length > 0) {
      // Controlla se l'utente è admin del gruppo
      const { data: group } = await this.supabase
        .getClient()
        .from('shopping_lists')
        .select('group_id')
        .eq('id', listId)
        .single();

      if (!group) {
        throw new ForbiddenException('Lista non trovata o non accessibile');
      }

      const { data: membership } = await this.supabase
        .getClient()
        .from('group_members')
        .select('role')
        .eq('group_id', group.group_id)
        .eq('user_id', userId)
        .single();

      if (!membership || membership.role !== 'admin') {
        throw new ForbiddenException(
          'Solo un admin può eliminare una lista con elementi al suo interno',
        );
      }
    }

    // Elimina la lista
    await this.supabase
      .getClient()
      .from('shopping_lists')
      .delete()
      .eq('id', listId);
    return { message: 'Lista eliminata con successo' };
  }
}
