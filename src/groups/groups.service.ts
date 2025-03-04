import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateGroupDto } from './dto/create-group.dto';
import * as bcrypt from 'bcrypt';
import { GroupMembersService } from './services/group-members.service';
import { GroupInvitesService } from './services/group-invites.service';

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  phone_number: string;
  avatar_url: string;
  balance?: number;
  role?: string;
  joined_at?: string;
}

interface GroupInvite {
  id: string;
  created_at: string;
  user_info: Profile;
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
  members: Profile[];
  join_requests: GroupInvite[];
  expenses: any[];
  balances: any[];
}

@Injectable()
export class GroupsService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly groupMembersService: GroupMembersService,
    private readonly groupInvitesService: GroupInvitesService,
  ) {}

  /**
   * Crea un nuovo gruppo e aggiunge automaticamente l'admin e il fondo spese
   */
  async createGroup(userId: string, dto: CreateGroupDto) {
    try {
      // 1️⃣ Generazione del tag univoco
      const uniqueTag = await this.generateUniqueTag(dto.name);

      // 2️⃣ Hash della password (se presente)
      const password_hash = await this.hashPasswordIfRequired(dto);

      // 3️⃣ Creazione del gruppo
      const group = await this.insertNewGroup(uniqueTag, dto, password_hash);

      // 4️⃣ Aggiunta dell'admin al gruppo
      await this.addAdminToGroup(userId, group.id);

      return {
        message: 'Gruppo creato con successo',
        group,
      };
    } catch (error) {
      throw new BadRequestException(
        `Errore durante la creazione del gruppo: ${error.message}`,
      );
    }
  }

  /**
   * Recupera i dettagli di un gruppo, inclusi membri, spese e bilancio
   */
  async getGroupDetails(
    groupId: string,
    userId: string,
  ): Promise<GroupDetails> {
    // Verifica se l'utente è membro del gruppo e recupera il ruolo
    const userRole = await this.fetchUserRoleInGroup(groupId, userId);

    // Recupera informazioni di base del gruppo
    const groupData = await this.fetchGroupBasicInfo(groupId);

    // Recupera membri del gruppo con i loro dettagli
    const { members, membersCount } = await this.fetchGroupMembers(groupId);

    // Recupera log delle spese del gruppo
    const expenses = await this.fetchGroupExpenses(groupId);

    // Recupera e calcola i bilanci del gruppo
    const { balances, balanceMap } =
      await this.fetchAndCalculateBalances(groupId);

    // Assegna i saldi ai membri
    const membersWithBalances = this.assignBalancesToMembers(
      members,
      balanceMap,
    );

    // Recupera le richieste di accesso al gruppo
    const joinRequests = await this.fetchGroupJoinRequests(groupId, userRole);

    // Trova l'admin ID
    const adminId =
      membersWithBalances.find((m) => m.role === 'admin')?.id || null;

    return {
      id: groupData.id,
      name: groupData.name,
      tag: groupData.tag,
      require_password: groupData.require_password,
      created_at: groupData.created_at,
      user_role: userRole,
      admin_id: adminId,
      members_count: membersCount,
      members: membersWithBalances,
      expenses,
      balances,
      join_requests: joinRequests,
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

    const { data: group } = await this.supabaseService
      .getClient()
      .from('groups')
      .select('*')
      .eq('tag', tag)
      .maybeSingle();

    return group;
  }

  /**
   * Unisce un utente a un gruppo tramite invito
   */
  async joinGroup(inviteToken: string, userId: string) {
    const invite = await this.groupInvitesService.validateInvite(inviteToken);

    await this.supabaseService.getClient().from('group_members').insert({
      user_id: userId,
      group_id: invite.group_id,
      role: 'member',
    });

    return { message: 'Aggiunto con successo' };
  }

  // ==================== METODI PRIVATI ====================

  /**
   * Genera un tag univoco basato sul nome del gruppo
   */
  private async generateUniqueTag(groupName: string): Promise<string> {
    const baseTag = groupName
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9\-]/g, '');

    let uniqueTag = baseTag;
    let suffix = 1;

    while (await this.isTagExists(uniqueTag)) {
      uniqueTag = `${baseTag}-${suffix}`;
      suffix++;
    }

    return uniqueTag;
  }

  /**
   * Verifica se un tag esiste già
   */
  private async isTagExists(tag: string): Promise<boolean> {
    const { data: existingTag } = await this.supabaseService
      .getClient()
      .from('groups')
      .select('id')
      .eq('tag', tag)
      .single();
    return !!existingTag;
  }

  /**
   * Genera l'hash della password se richiesto
   */
  private async hashPasswordIfRequired(
    dto: CreateGroupDto,
  ): Promise<string | null> {
    if (dto.requirePassword && dto.password) {
      return bcrypt.hash(dto.password, 10);
    }
    return null;
  }

  /**
   * Inserisce un nuovo gruppo nel database
   */
  private async insertNewGroup(
    tag: string,
    dto: CreateGroupDto,
    passwordHash: string | null,
  ) {
    const { data: groupData, error: groupError } = await this.supabaseService
      .getClient()
      .from('groups')
      .insert({
        name: dto.name,
        tag: tag,
        require_password: dto.requirePassword ?? false,
        password_hash: passwordHash,
      })
      .select()
      .single();

    if (groupError) {
      throw new Error(
        `Errore durante la creazione del gruppo: ${groupError.message}`,
      );
    }

    return groupData;
  }

  /**
   * Aggiunge l'utente creatore come admin del gruppo
   */
  private async addAdminToGroup(userId: string, groupId: string) {
    const { error: memberError } = await this.supabaseService
      .getClient()
      .from('group_members')
      .insert({
        user_id: userId,
        group_id: groupId,
        role: 'admin',
      });

    if (memberError) {
      throw new Error(`Errore nell'aggiungere l'admin: ${memberError.message}`);
    }
  }

  /**
   * Recupera le informazioni di base del gruppo
   */
  private async fetchGroupBasicInfo(groupId: string) {
    const { data: groupData, error } = await this.supabaseService
      .getClient()
      .from('groups')
      .select('id, name, tag, require_password, created_at')
      .eq('id', groupId)
      .maybeSingle();

    if (error || !groupData) {
      throw new NotFoundException(`❌ Gruppo non trovato: ${groupId}`);
    }

    return groupData;
  }

  /**
   * Verifica e recupera il ruolo dell'utente nel gruppo
   */
  private async fetchUserRoleInGroup(
    groupId: string,
    userId: string,
  ): Promise<string> {
    const { data: memberData, error } = await this.supabaseService
      .getClient()
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !memberData) {
      throw new ForbiddenException('❌ Non sei membro di questo gruppo');
    }

    return memberData.role;
  }

  /**
   * Recupera i membri del gruppo con i loro dettagli
   */
  private async fetchGroupMembers(groupId: string) {
    const { data: membersData, error: membersError } =
      await this.supabaseService
        .getClient()
        .from('group_members')
        .select(
          `
        user_id, role, joined_at,
        profiles (id, first_name, last_name, full_name, phone_number, avatar_url)
        `,
        )
        .eq('group_id', groupId);

    if (membersError) {
      throw new InternalServerErrorException(
        `❌ Errore nel recupero dei membri: ${membersError.message}`,
      );
    }

    // Formatta i dati dei membri
    const members = (membersData || []).map((member) => {
      const profile = Array.isArray(member.profiles)
        ? member.profiles[0]
        : member.profiles;

      return {
        id: profile?.id || member.user_id,
        first_name: profile?.first_name || '',
        last_name: profile?.last_name || '',
        full_name: profile?.full_name || 'Utente sconosciuto',
        role: member.role,
        joined_at: member.joined_at,
        phone_number: profile?.phone_number || null,
        avatar_url: profile?.avatar_url || null,
        balance: 0, // Verrà aggiornato successivamente
      };
    });

    return { members, membersCount: members.length };
  }

  /**
   * Recupera le spese del gruppo
   */
  private async fetchGroupExpenses(groupId: string) {
    const { data: expensesData } = await this.supabaseService
      .getClient()
      .from('expenses_log')
      .select('*')
      .eq('group_id', groupId);

    return expensesData || [];
  }

  /**
   * Recupera e calcola i bilanci del gruppo
   */
  private async fetchAndCalculateBalances(groupId: string) {
    const { data: balancesData } = await this.supabaseService
      .getClient()
      .from('group_balances')
      .select('payer_id, user_id, amount')
      .eq('group_id', groupId);

    const balances = balancesData || [];

    // Calcola il saldo di ogni membro
    const balanceMap: { [key: string]: number } = {};

    balances.forEach(({ payer_id, user_id, amount }) => {
      if (!balanceMap[payer_id]) balanceMap[payer_id] = 0;
      if (!balanceMap[user_id]) balanceMap[user_id] = 0;

      balanceMap[user_id] -= amount; // L'utente ha un debito
      balanceMap[payer_id] += amount; // Il payer ha un credito
    });

    return { balances, balanceMap };
  }

  /**
   * Assegna i saldi ai membri
   */
  private assignBalancesToMembers(
    members: Profile[],
    balanceMap: { [key: string]: number },
  ): Profile[] {
    return members.map((member) => ({
      ...member,
      balance: balanceMap[member.id] || 0,
    }));
  }

  /**
   * Recupera le richieste di accesso al gruppo
   */
  private async fetchGroupJoinRequests(
    groupId: string,
    userRole: string,
  ): Promise<GroupInvite[]> {
    // Solo gli admin possono vedere le richieste di accesso
    if (userRole !== 'admin') {
      return [];
    }

    const { data: joinRequestsData, error: joinRequestsError } =
      await this.supabaseService
        .getClient()
        .from('group_join_requests')
        .select(
          `
        id,
        user_id,
        created_at,
        profiles (id, first_name, last_name, full_name, phone_number, avatar_url)
        `,
        )
        .eq('group_id', groupId)
        .eq('status', 'pending');

    if (joinRequestsError) {
      throw new InternalServerErrorException(
        `Errore nel recupero delle richieste di accesso: ${joinRequestsError.message}`,
      );
    }

    // Mappa i dati delle richieste di accesso
    return (joinRequestsData || []).map((request) => {
      const profile = Array.isArray(request.profiles)
        ? request.profiles[0]
        : request.profiles;

      return {
        id: request.id,
        created_at: request.created_at,
        user_info: {
          id: profile?.id || request.user_id,
          first_name: profile?.first_name || '',
          last_name: profile?.last_name || '',
          full_name: profile?.full_name || '',
          phone_number: profile?.phone_number || null,
          avatar_url: profile?.avatar_url || null,
        },
      };
    });
  }
}
