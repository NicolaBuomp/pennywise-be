import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { v4 as uuidv4 } from 'uuid';
import { CreateGroupDto } from './dto/create-group.dto';
import { CreateInviteDto } from './dto/create-invite.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import * as bcrypt from 'bcrypt';

interface GroupInvite {
  id: string;
  user_id: string;
  created_at: string;
}

export interface GroupDetails {
  id: string;
  name: string;
  tag: string;
  require_password: boolean;
  created_at: string | Date;
  user_role: string;
  admin_id: string | null;
  members_count: number;
  members: any[];
  join_requests: GroupInvite[];
  expenses: any[];
  balances: any[];
}

@Injectable()
export class GroupsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Crea un nuovo gruppo e aggiunge automaticamente l'admin e il fondo spese
   */
  async createGroup(userId: string, dto: CreateGroupDto) {
    // 1️⃣ Generazione del tag univoco
    const baseTag = dto.name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9\-]/g, '');
    let uniqueTag = baseTag;
    let suffix = 1;

    while (await this.isTagExists(uniqueTag)) {
      uniqueTag = `${baseTag}-${suffix}`;
      suffix++;
    }

    // 2️⃣ Hash della password (se presente)
    let password_hash = null;
    if (dto.requirePassword && dto.password) {
      password_hash = await bcrypt.hash(dto.password, 10);
    }

    // 3️⃣ Creazione del gruppo
    const { data: groupData, error: groupError } = await this.supabaseService
      .getClient()
      .from('groups')
      .insert({
        name: dto.name,
        tag: uniqueTag,
        require_password: dto.requirePassword ?? false,
        password_hash,
      })
      .select()
      .single();

    if (groupError) {
      throw new Error(
        `Errore durante la creazione del gruppo: ${groupError.message}`,
      );
    }

    // 4️⃣ Aggiunta dell'admin al gruppo
    const { error: memberError } = await this.supabaseService
      .getClient()
      .from('group_members')
      .insert({
        user_id: userId,
        group_id: groupData.id,
        role: 'admin',
      });

    if (memberError) {
      throw new Error(`Errore nell'aggiungere l'admin: ${memberError.message}`);
    }

    return { message: 'Gruppo creato con successo',
      group: {
        ...groupData
      }
    };
  }

  /**
   * Recupera i dettagli di un gruppo, inclusi membri, spese e bilancio
   */
  async getGroupDetails(groupId: string, userId: string): Promise<GroupDetails> {
    const supabase = this.supabaseService.getClient();

    // 1️⃣ Verifica se l'utente è membro del gruppo
    const { data: memberData } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .maybeSingle();

    if (!memberData) {
      throw new ForbiddenException('❌ Non sei membro di questo gruppo');
    }

    // 2️⃣ Recuperiamo i dati del gruppo
    const { data: groupData } = await supabase
      .from('groups')
      .select('id, name, tag, require_password, created_at')
      .eq('id', groupId)
      .maybeSingle();

    if (!groupData) {
      throw new NotFoundException(`❌ Gruppo non trovato: ${groupId}`);
    }

    // 3️⃣ Recuperiamo i membri del gruppo con dettagli utente
    const { data: membersData, error: membersError } = await supabase
      .from('group_members')
      .select(`
      user_id, role, joined_at,
      profiles (id, first_name, last_name, full_name, phone_number, avatar_url)
    `)
      .eq('group_id', groupId);

    if (membersError) {
      throw new InternalServerErrorException(`❌ Errore nel recupero dei membri: ${membersError.message}`);
    }

    // 4️⃣ Formattiamo i dati dei membri
    const members = (membersData || []).map((member) => {
      const profile = Array.isArray(member.profiles) ? member.profiles[0] : member.profiles;

      return {
        id: profile?.id || member.user_id,
        first_name: profile?.first_name || '',
        last_name: profile?.last_name || '',
        full_name: profile?.full_name || 'Utente sconosciuto',
        role: member.role,
        joined_at: member.joined_at,
        phone_number: profile?.phone_number || null,
        avatar_url: profile?.avatar_url || null,
        balance: 0, // Lo aggiorneremo dopo
      };
    });

    // 5️⃣ Recuperiamo il log delle spese del gruppo
    const { data: expensesData } = await supabase
      .from('expenses_log')
      .select('*')
      .eq('group_id', groupId);

    const expenses = expensesData || [];

    // 6️⃣ Recuperiamo i bilanci del gruppo
    const { data: balancesData } = await supabase
      .from('group_balances')
      .select('payer_id, user_id, amount')
      .eq('group_id', groupId);

    const balances = balancesData || [];

    // 7️⃣ Calcoliamo il saldo di ogni membro
    const balanceMap: { [key: string]: number } = {};

    balances.forEach(({ payer_id, user_id, amount }) => {
      if (!balanceMap[payer_id]) balanceMap[payer_id] = 0;
      if (!balanceMap[user_id]) balanceMap[user_id] = 0;

      balanceMap[user_id] -= amount; // L'utente ha un debito
      balanceMap[payer_id] += amount; // Il payer ha un credito
    });

    // 8️⃣ Assegniamo i saldi ai membri
    members.forEach((member) => {
      member.balance = balanceMap[member.id] || 0;
    });

    // 9️⃣ Recuperiamo le richieste di accesso in sospeso
    const { data: joinRequestsData } = await supabase
      .from('group_join_requests')
      .select('id, user_id, created_at')
      .eq('group_id', groupId)
      .eq('status', 'pending');

    const join_requests: GroupInvite[] = joinRequestsData || [];

    return {
      id: groupData.id,
      name: groupData.name,
      tag: groupData.tag,
      require_password: groupData.require_password,
      created_at: groupData.created_at,
      user_role: memberData.role,
      admin_id: members.find((m) => m.role === 'admin')?.id || null,
      members_count: members.length,
      members,
      expenses,
      balances,
      join_requests,
    };
  }

  /**
   * Recupera tutti i gruppi di cui un utente fa parte
   */
  async getUserGroups(userId: string) {
    const { data: groupMemberships } = await this.supabaseService
      .getClient()
      .from('group_members')
      .select('group_id')
      .eq('user_id', userId);

    if (!groupMemberships || groupMemberships.length === 0) {
      return [];
    }

    const groupIds = groupMemberships.map((g) => g.group_id);

    const { data: groups } = await this.supabaseService
      .getClient()
      .from('groups')
      .select('*')
      .in('id', groupIds);

    return groups;
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
    console.log(groupTag, 'groupTag');
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

    console.log(group);

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


  // Funzione per verificare se un tag esiste già
  private async isTagExists(tag: string): Promise<boolean> {
    const { data: existingTag } = await this.supabaseService
      .getClient()
      .from('groups')
      .select('id')
      .eq('tag', tag)
      .single();
    return !!existingTag;
  }
}
