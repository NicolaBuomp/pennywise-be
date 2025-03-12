import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { Group } from './entities/group.entity';
import { GroupMember } from './entities/group-member.entity';
import { SearchGroupsDto } from './dto/search-group.dto';

@Injectable()
export class GroupsService {
  constructor(private supabaseService: SupabaseService) {}

  async create(createGroupDto: CreateGroupDto, userId: string) {
    // Genera un identificatore unico per il gruppo
    const baseIdentifier = createGroupDto.name.substring(0, 3).toLowerCase();
    const randomSuffix = Math.floor(100000 + Math.random() * 900000).toString();
    const groupIdentifier = `${baseIdentifier}${randomSuffix}`;

    // Crea il gruppo
    const { data: group, error } = await this.supabaseService
      .getClient()
      .from('groups')
      .insert({
        ...createGroupDto,
        group_identifier: groupIdentifier,
        created_by: userId,
        member_count: 1, // Il creatore è il primo membro
      })
      .select()
      .single();

    if (error)
      throw new Error(`Errore nella creazione del gruppo: ${error.message}`);

    // Aggiungi il creatore come admin
    const { error: memberError } = await this.supabaseService
      .getClient()
      .from('group_members')
      .insert({
        group_id: group.id,
        user_id: userId,
        role: 'admin',
      });

    if (memberError)
      throw new Error(
        `Errore nell'aggiungere l'utente al gruppo: ${memberError.message}`,
      );

    return group;
  }

  async searchPublicGroups(searchGroupsDto: SearchGroupsDto) {
    // Estrai i valori con valori predefiniti
    const {
      search,
      currency,
      sortBy = 'relevance',
      sortDir = 'desc',
      page = 1,
      limit = 10,
    } = searchGroupsDto;

    // Inizia a costruire la query
    let query = this.supabaseService
      .getClient()
      .from('groups')
      .select('*', { count: 'exact' })
      .eq('privacy_type', 'public');

    // Aggiungi filtri se specificati
    if (currency) {
      query = query.eq('default_currency', currency);
    }

    // Gestisci la ricerca testuale
    if (search) {
      // Usiamo la funzionalità di ricerca di testo di Postgres
      query = query.textSearch('name', search, {
        type: 'websearch',
        config: 'english',
      });
    }

    // Ottieni il conteggio totale prima di applicare paginazione
    const { count } = await query;
    const totalCount = count || 0; // Usa 0 se count è null

    // Gestisci l'ordinamento
    switch (sortBy) {
      case 'created_at':
        query = query.order('created_at', { ascending: sortDir === 'asc' });
        break;
      case 'member_count':
        query = query.order('member_count', { ascending: sortDir === 'asc' });
        break;
      case 'relevance':
      default:
        if (search) {
          // Se c'è un termine di ricerca, lascia l'ordinamento predefinito della ricerca di testo
        } else {
          // Altrimenti, ordina per conteggio membri
          query = query.order('member_count', { ascending: false });
        }
        break;
    }

    // Applica paginazione
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    query = query.range(from, to);

    // Esegui la query
    const { data: groups, error } = await query;

    if (error)
      throw new Error(`Errore nella ricerca dei gruppi: ${error.message}`);

    return {
      data: groups || [],
      meta: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  async findAllByUser(userId: string) {
    // Trova tutti i gruppi di cui l'utente è membro
    const { data: groupMembers, error } = await this.supabaseService
      .getClient()
      .from('group_members')
      .select(
        `
        group_id,
        groups (*)
      `,
      )
      .eq('user_id', userId);

    if (error)
      throw new Error(`Errore nel recupero dei gruppi: ${error.message}`);

    // Estrai i gruppi dalla risposta
    return (groupMembers || []).map((member) => member.groups);
  }

  async findOne(id: string, userId: string) {
    // Verifica prima che l'utente sia membro del gruppo
    const { data: membership, error: membershipError } =
      await this.supabaseService
        .getClient()
        .from('group_members')
        .select()
        .eq('group_id', id)
        .eq('user_id', userId)
        .maybeSingle();

    // Se l'utente non è membro, controlla se il gruppo è pubblico
    if (!membership) {
      const { data: group, error: groupError } = await this.supabaseService
        .getClient()
        .from('groups')
        .select('privacy_type')
        .eq('id', id)
        .maybeSingle();

      if (groupError || !group) {
        throw new NotFoundException(`Gruppo con ID ${id} non trovato`);
      }

      if (group.privacy_type !== 'public') {
        throw new ForbiddenException(
          'Non sei autorizzato ad accedere a questo gruppo',
        );
      }
    }

    // Ottieni i dettagli del gruppo
    const { data: group, error } = await this.supabaseService
      .getClient()
      .from('groups')
      .select(
        `
        *,
        members:group_members(
          id,
          user_id,
          role,
          joined_at,
          users(id, display_name, avatar_url)
        )
      `,
      )
      .eq('id', id)
      .single();

    if (error || !group) {
      throw new NotFoundException(`Gruppo con ID ${id} non trovato`);
    }

    return group;
  }

  async update(id: string, updateGroupDto: UpdateGroupDto, userId: string) {
    // Verifica che l'utente sia admin del gruppo
    const { data: membership, error: membershipError } =
      await this.supabaseService
        .getClient()
        .from('group_members')
        .select()
        .eq('group_id', id)
        .eq('user_id', userId)
        .eq('role', 'admin')
        .maybeSingle();

    if (!membership) {
      throw new ForbiddenException(
        'Solo gli amministratori possono modificare il gruppo',
      );
    }

    // Aggiorna il gruppo
    const { data, error } = await this.supabaseService
      .getClient()
      .from('groups')
      .update(updateGroupDto)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Errore nell'aggiornamento del gruppo: ${error.message}`);
    }

    return data;
  }

  async remove(id: string, userId: string) {
    // Verifica che l'utente sia admin del gruppo
    const { data: membership, error: membershipError } =
      await this.supabaseService
        .getClient()
        .from('group_members')
        .select()
        .eq('group_id', id)
        .eq('user_id', userId)
        .eq('role', 'admin')
        .maybeSingle();

    if (!membership) {
      throw new ForbiddenException(
        'Solo gli amministratori possono eliminare il gruppo',
      );
    }

    // Elimina il gruppo (le foreign key con ON DELETE CASCADE gestiscono le relazioni)
    const { error } = await this.supabaseService
      .getClient()
      .from('groups')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Errore nell'eliminazione del gruppo: ${error.message}`);
    }

    return { success: true, message: 'Gruppo eliminato con successo' };
  }
}
