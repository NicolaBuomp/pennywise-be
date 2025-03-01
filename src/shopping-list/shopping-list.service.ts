import {
  Injectable,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class ShoppingListService {
  constructor(private readonly supabase: SupabaseService) {}

  async create(groupId: string, name: string, userId: string) {
    const { data: membership, error: membershipError } = await this.supabase
      .getClient()
      .from('group_members')
      .select('id')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .single();

    if (membershipError || !membership) {
      throw new ForbiddenException('Non fai parte di questo gruppo');
    }

    const { data, error } = await this.supabase
      .getClient()
      .from('shopping_lists')
      .insert([{ group_id: groupId, name, created_by: userId }])
      .single();

    if (error)
      throw new InternalServerErrorException(
        'Errore nella creazione della lista',
      );
    return data;
  }

  async findAll(groupId: string, userId: string) {
    const { data: membership, error: membershipError } = await this.supabase
      .getClient()
      .from('group_members')
      .select('id')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .single();

    if (membershipError || !membership) {
      throw new ForbiddenException('Non fai parte di questo gruppo');
    }

    const { data, error } = await this.supabase
      .getClient()
      .from('shopping_lists')
      .select('*')
      .eq('group_id', groupId);

    if (error)
      throw new InternalServerErrorException('Errore nel recupero delle liste');
    return data;
  }

  async updateName(listId: string, newName: string, userId: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('shopping_lists')
      .select('created_by')
      .eq('id', listId)
      .single();

    if (error || !data || data.created_by !== userId) {
      throw new ForbiddenException(
        'Solo il creatore può rinominare questa lista',
      );
    }

    const { error: updateError } = await this.supabase
      .getClient()
      .from('shopping_lists')
      .update({ name: newName })
      .eq('id', listId);

    if (updateError)
      throw new InternalServerErrorException(
        `Errore nell'aggiornamento della lista`,
      );
    return { message: 'Nome della lista aggiornato con successo' };
  }

  async remove(listId: string, userId: string) {
    const { data: items, error: itemError } = await this.supabase
      .getClient()
      .from('shopping_items')
      .select('id')
      .eq('list_id', listId);

    if (itemError)
      throw new InternalServerErrorException(
        'Errore nel controllo degli elementi della lista',
      );

    if (items.length > 0) {
      const { data: group, error: groupError } = await this.supabase
        .getClient()
        .from('shopping_lists')
        .select('group_id')
        .eq('id', listId)
        .single();

      if (groupError || !group) {
        throw new ForbiddenException('Lista non trovata o non accessibile');
      }

      const { data: membership, error: membershipError } = await this.supabase
        .getClient()
        .from('group_members')
        .select('role')
        .eq('group_id', group.group_id)
        .eq('user_id', userId)
        .single();

      if (membershipError || !membership || membership.role !== 'admin') {
        throw new ForbiddenException(
          'Solo un admin può eliminare una lista con elementi al suo interno',
        );
      }
    }

    await this.supabase
      .getClient()
      .from('shopping_items')
      .delete()
      .eq('list_id', listId);
    await this.supabase
      .getClient()
      .from('shopping_lists')
      .delete()
      .eq('id', listId);
    return { message: 'Lista eliminata con successo' };
  }
}
