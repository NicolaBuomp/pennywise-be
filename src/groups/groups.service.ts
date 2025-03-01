import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { v4 as uuidv4 } from 'uuid';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { CreateInviteDto } from './dto/create-invite.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class GroupsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Crea un gruppo e aggiunge l'utente come admin
   */
  async createGroup(userId: string, dto: CreateGroupDto) {
    // 1. Verifica che il TAG sia univoco
    const { data: existingTag, error: tagError } = await this.supabaseService
      .getClient()
      .from('groups')
      .select('id')
      .eq('tag', dto.tag)
      .single();

    if (existingTag) {
      throw new BadRequestException(`Il TAG '${dto.tag}' è già in uso`);
    }

    // 2. Crea il gruppo
    const { data: groupData, error: groupError } = await this.supabaseService
      .getClient()
      .from('groups')
      .insert({
        name: dto.name,
        tag: dto.tag,
        requirePassword: dto.requirePassword ?? false,
        passwordHash: null,
      })
      .select()
      .single();

    if (groupError) {
      throw new Error(groupError.message);
    }

    // 3. Aggiunge il creatore come admin in `group_members`
    const { error: memberError } = await this.supabaseService
      .getClient()
      .from('group_members')
      .insert({
        user_id: userId,
        group_id: groupData.id,
        role: 'admin',
      });

    if (memberError) {
      throw new Error(memberError.message);
    }

    return groupData;
  }

  /**
   * Recupera tutti i gruppi di cui l'utente fa parte
   */
  async getUserGroups(userId: string) {
    if (!userId) {
      throw new BadRequestException('User ID non valido');
    }

    const { data: memberData, error: memberError } = await this.supabaseService
      .getClient()
      .from('group_members')
      .select('group_id')
      .eq('user_id', userId);

    if (memberError) {
      throw new Error(
        `Errore nel recupero delle membership: ${memberError.message}`,
      );
    }

    if (!memberData || memberData.length === 0) {
      return []; // Utente non in nessun gruppo
    }

    const groupIds = memberData.map((item) => item.group_id);
    console.log('Gruppi trovati:', groupIds);

    const { data: groupsData, error: groupsError } = await this.supabaseService
      .getClient()
      .from('groups')
      .select('*')
      .in('id', groupIds);

    if (groupsError) {
      throw new Error(`Errore nel recupero dei gruppi: ${groupsError.message}`);
    }

    return groupsData;
  }

  /**
   * Recupera i dettagli di un gruppo
   */
  async getGroupDetails(groupId: string, userId: string) {
    const { data: memberData, error: memberError } = await this.supabaseService
      .getClient()
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .maybeSingle();

    if (!memberData) {
      throw new ForbiddenException('Non sei membro di questo gruppo');
    }

    const { data: groupData, error: groupError } = await this.supabaseService
      .getClient()
      .from('groups')
      .select(
        `
      id, name, tag, requirePassword, created_at,
      group_members (id, user_id, role, joined_at, user:profiles(*))
    `,
      )
      .eq('id', groupId)
      .single();

    if (!groupData) {
      throw new NotFoundException('Gruppo non trovato');
    }

    let invites: any[] = [];

    if (memberData.role === 'admin') {
      const { data: invitesData } = await this.supabaseService
        .getClient()
        .from('group_invites')
        .select('*')
        .eq('group_id', groupId);

      invites = invitesData ?? [];
    }

    return { ...groupData, invites };
  }

  /**
   * Cerca un gruppo tramite il suo TAG
   */
  async searchGroupByTag(tag: string) {
    if (!tag.trim()) {
      throw new BadRequestException('Il TAG non può essere vuoto');
    }

    // 1. Cerchiamo il gruppo
    const { data: group, error: groupError } = await this.supabaseService
      .getClient()
      .from('groups')
      .select('*')
      .eq('tag', tag)
      .maybeSingle(); // 🔹 Usiamo `.maybeSingle()` per non generare errore se non ci sono risultati

    // 2. Se non troviamo il gruppo, restituiamo un messaggio chiaro
    if (!group) {
      return null;
    }

    return group;
  }

  /**
   * Crea un invito con token
   */
  async createInvite(groupId: string, userId: string, dto: CreateInviteDto) {
    const inviteToken = uuidv4();
    const expiresAt = new Date(
      Date.now() + (dto.expiresInHours ?? 24) * 3600 * 1000,
    );

    const { error } = await this.supabaseService
      .getClient()
      .from('group_invites')
      .insert({
        group_id: groupId,
        invite_token: inviteToken,
        expires_at: expiresAt.toISOString(),
      });

    if (error) {
      throw new Error(error.message);
    }

    return { inviteToken, expiresAt };
  }

  /**
   * Unisce un utente a un gruppo tramite invito
   */
  async joinGroup(inviteToken: string, userId: string) {
    const { data: invite } = await this.supabaseService
      .getClient()
      .from('group_invites')
      .select('*')
      .eq('invite_token', inviteToken)
      .single();

    if (!invite) {
      throw new NotFoundException('Invito non valido');
    }

    if (new Date(invite.expires_at) < new Date()) {
      throw new BadRequestException('Invito scaduto');
    }

    await this.supabaseService.getClient().from('group_members').insert({
      user_id: userId,
      group_id: invite.group_id,
      role: 'member',
    });

    return { message: 'Aggiunto con successo' };
  }

  /**
   * Rimuove un utente dal gruppo
   */
  async removeUser(groupId: string, userId: string, adminId: string) {
    const { data: adminCheck } = await this.supabaseService
      .getClient()
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', adminId)
      .single();

    if (adminCheck?.role !== 'admin') {
      throw new ForbiddenException('Solo gli admin possono rimuovere utenti');
    }

    await this.supabaseService
      .getClient()
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', userId);
  }

  /**
   * Aggiorna il ruolo di un membro
   */
  async updateUserRole(dto: UpdateRoleDto) {
    await this.supabaseService
      .getClient()
      .from('group_members')
      .update({ role: dto.role })
      .eq('group_id', dto.group_id)
      .eq('user_id', dto.user_id);
  }

  // 1️⃣ Gli utenti possono fare richiesta di ingresso a un gruppo tramite tag
  async createJoinRequest(groupTag: string, userId: string) {
    // 1. Trova il gruppo tramite il tag
    const { data: group, error: groupError } = await this.supabaseService
      .getClient()
      .from('groups')
      .select('id')
      .eq('tag', groupTag)
      .single();

    if (groupError || !group) {
      throw new NotFoundException('Gruppo non trovato');
    }

    // 2. Crea la richiesta di ingresso (stato 'pending')
    const { data: request, error: requestError } = await this.supabaseService
      .getClient()
      .from('group_join_requests')
      .insert({
        group_id: group.id,
        user_id: userId,
        status: 'pending',
      })
      .select()
      .single();

    if (requestError) {
      throw new Error('Errore nella creazione della richiesta di ingresso');
    }

    return request;
  }

  // 2️⃣ Recupera tutte le richieste di ingresso di un gruppo (solo admin)
  async getJoinRequests(groupId: string, userId: string) {
    // Verifica che l'utente sia un admin del gruppo
    const { data: adminCheck, error: adminError } = await this.supabaseService
      .getClient()
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .single();

    if (adminError || adminCheck?.role !== 'admin') {
      throw new ForbiddenException('Solo un admin può vedere le richieste');
    }

    // Ottieni tutte le richieste per quel gruppo
    const { data: joinRequests, error: requestsError } =
      await this.supabaseService
        .getClient()
        .from('group_join_requests')
        .select('user_id, status, created_at')
        .eq('group_id', groupId);

    if (requestsError) {
      throw new Error('Errore nel recupero delle richieste di ingresso');
    }

    return joinRequests;
  }

  // 3️⃣ Approva o rifiuta una richiesta di ingresso
  async updateJoinRequestStatus(
    requestId: string,
    status: 'approved' | 'denied',
    adminId: string,
  ) {
    // Verifica che l'utente sia un admin
    const { data: request, error: requestError } = await this.supabaseService
      .getClient()
      .from('group_join_requests')
      .select('group_id, user_id')
      .eq('id', requestId)
      .single();

    if (requestError || !request) {
      throw new NotFoundException('Richiesta di ingresso non trovata');
    }

    const { data: adminCheck, error: adminError } = await this.supabaseService
      .getClient()
      .from('group_members')
      .select('role')
      .eq('group_id', request.group_id)
      .eq('user_id', adminId)
      .single();

    if (adminError || adminCheck?.role !== 'admin') {
      throw new ForbiddenException(
        'Solo un admin può approvare o rifiutare le richieste',
      );
    }

    // 4. Approva o rifiuta la richiesta
    const { error: updateError } = await this.supabaseService
      .getClient()
      .from('group_join_requests')
      .update({ status })
      .eq('id', requestId);

    if (updateError) {
      throw new Error("Errore nell'approvare o rifiutare la richiesta");
    }

    // 5. Se approvata, aggiungi l'utente al gruppo
    if (status === 'approved') {
      await this.supabaseService.getClient().from('group_members').insert({
        user_id: request.user_id,
        group_id: request.group_id,
        role: 'member', // Aggiungi come membro
      });
    }

    return { message: `La richiesta è stata ${status}` };
  }
}
