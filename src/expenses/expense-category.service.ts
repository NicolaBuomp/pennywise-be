import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import {
  CreateExpenseCategoryDto,
  UpdateExpenseCategoryDto,
} from './dto/create-expense-category.dto';

@Injectable()
export class ExpenseCategoryService {
  constructor(private supabaseService: SupabaseService) {}

  /**
   * Crea una nuova categoria di spesa
   */
  async create(
    groupId: string,
    createCategoryDto: CreateExpenseCategoryDto,
    userId: string,
  ) {
    // Verifica se l'utente è admin del gruppo (solo admin possono creare categorie)
    const { data: membership, error: membershipError } =
      await this.supabaseService
        .getClient()
        .from('group_members')
        .select('role')
        .eq('group_id', groupId)
        .eq('user_id', userId)
        .eq('role', 'admin')
        .maybeSingle();

    if (!membership) {
      throw new ForbiddenException(
        'Solo gli amministratori possono creare categorie di spesa',
      );
    }

    // Crea la categoria
    const { data: category, error } = await this.supabaseService
      .getClient()
      .from('expense_categories')
      .insert({
        name: createCategoryDto.name,
        color: createCategoryDto.color || '#90caf9',
        icon: createCategoryDto.icon,
        group_id: createCategoryDto.global ? null : groupId,
        global: createCategoryDto.global || false,
      })
      .select()
      .single();

    if (error) {
      throw new Error(
        `Errore nella creazione della categoria: ${error.message}`,
      );
    }

    return category;
  }

  /**
   * Ottieni tutte le categorie disponibili per un gruppo
   */
  async findAll(groupId: string, userId: string) {
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
        'Devi essere membro del gruppo per visualizzare le categorie',
      );
    }

    // Ottieni le categorie specifiche del gruppo e quelle globali
    const { data: categories, error } = await this.supabaseService
      .getClient()
      .from('expense_categories')
      .select()
      .or(`group_id.eq.${groupId},global.eq.true`)
      .order('name', { ascending: true });

    if (error) {
      throw new Error(`Errore nel recupero delle categorie: ${error.message}`);
    }

    return categories || [];
  }

  /**
   * Ottieni una categoria specifica
   */
  async findOne(categoryId: string, userId: string) {
    const { data: category, error } = await this.supabaseService
      .getClient()
      .from('expense_categories')
      .select()
      .eq('id', categoryId)
      .single();

    if (error || !category) {
      throw new NotFoundException(`Categoria con ID ${categoryId} non trovata`);
    }

    // Se la categoria non è globale, verifica che l'utente sia membro del gruppo
    if (!category.global && category.group_id) {
      const { data: membership, error: membershipError } =
        await this.supabaseService
          .getClient()
          .from('group_members')
          .select()
          .eq('group_id', category.group_id)
          .eq('user_id', userId)
          .maybeSingle();

      if (!membership) {
        throw new ForbiddenException('Non hai accesso a questa categoria');
      }
    }

    return category;
  }

  /**
   * Aggiorna una categoria
   */
  async update(
    categoryId: string,
    updateCategoryDto: UpdateExpenseCategoryDto,
    userId: string,
  ) {
    // Ottieni la categoria esistente
    const { data: category, error: categoryError } = await this.supabaseService
      .getClient()
      .from('expense_categories')
      .select()
      .eq('id', categoryId)
      .single();

    if (categoryError || !category) {
      throw new NotFoundException(`Categoria con ID ${categoryId} non trovata`);
    }

    // Se la categoria è globale, solo gli admin dell'app possono modificarla
    // Qui assumiamo che ci sia un campo is_admin nella tabella users per gli amministratori dell'app
    if (category.global) {
      const { data: adminUser, error: adminError } = await this.supabaseService
        .getClient()
        .from('users')
        .select('is_admin')
        .eq('id', userId)
        .single();

      if (!adminUser || !adminUser.is_admin) {
        throw new ForbiddenException(
          'Solo gli amministratori possono modificare categorie globali',
        );
      }
    } else if (category.group_id) {
      // Se non è globale, verifica che l'utente sia admin del gruppo
      const { data: membership, error: membershipError } =
        await this.supabaseService
          .getClient()
          .from('group_members')
          .select('role')
          .eq('group_id', category.group_id)
          .eq('user_id', userId)
          .eq('role', 'admin')
          .maybeSingle();

      if (!membership) {
        throw new ForbiddenException(
          'Solo gli amministratori del gruppo possono modificare categorie',
        );
      }
    }

    // Aggiorna la categoria
    const { data: updatedCategory, error } = await this.supabaseService
      .getClient()
      .from('expense_categories')
      .update({
        name: updateCategoryDto.name,
        color: updateCategoryDto.color,
        icon: updateCategoryDto.icon,
      })
      .eq('id', categoryId)
      .select()
      .single();

    if (error) {
      throw new Error(
        `Errore nell'aggiornamento della categoria: ${error.message}`,
      );
    }

    return updatedCategory;
  }

  /**
   * Elimina una categoria
   */
  async remove(categoryId: string, userId: string) {
    // Ottieni la categoria esistente
    const { data: category, error: categoryError } = await this.supabaseService
      .getClient()
      .from('expense_categories')
      .select()
      .eq('id', categoryId)
      .single();

    if (categoryError || !category) {
      throw new NotFoundException(`Categoria con ID ${categoryId} non trovata`);
    }

    // Se la categoria è globale, solo gli admin dell'app possono eliminarla
    if (category.global) {
      const { data: adminUser, error: adminError } = await this.supabaseService
        .getClient()
        .from('users')
        .select('is_admin')
        .eq('id', userId)
        .single();

      if (!adminUser || !adminUser.is_admin) {
        throw new ForbiddenException(
          'Solo gli amministratori possono eliminare categorie globali',
        );
      }
    } else if (category.group_id) {
      // Se non è globale, verifica che l'utente sia admin del gruppo
      const { data: membership, error: membershipError } =
        await this.supabaseService
          .getClient()
          .from('group_members')
          .select('role')
          .eq('group_id', category.group_id)
          .eq('user_id', userId)
          .eq('role', 'admin')
          .maybeSingle();

      if (!membership) {
        throw new ForbiddenException(
          'Solo gli amministratori del gruppo possono eliminare categorie',
        );
      }
    }

    // Verifica se la categoria è utilizzata in qualche spesa
    const { count, error: usageError } = await this.supabaseService
      .getClient()
      .from('expenses')
      .select('id', { count: 'exact' })
      .eq('category_id', categoryId);

    if (usageError) {
      throw new Error(
        `Errore nel controllo dell'utilizzo della categoria: ${usageError.message}`,
      );
    }

    if (count && count > 0) {
      throw new ForbiddenException(
        'Non è possibile eliminare una categoria utilizzata in spese esistenti. ' +
          'Modifica prima le spese che utilizzano questa categoria.',
      );
    }

    // Elimina la categoria
    const { error } = await this.supabaseService
      .getClient()
      .from('expense_categories')
      .delete()
      .eq('id', categoryId);

    if (error) {
      throw new Error(
        `Errore nell'eliminazione della categoria: ${error.message}`,
      );
    }

    return {
      success: true,
      message: 'Categoria eliminata con successo',
    };
  }
}
