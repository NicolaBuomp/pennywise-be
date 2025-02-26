import {
  Injectable,
  ForbiddenException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { v4 as uuidv4 } from 'uuid';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GroupsService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly configService: ConfigService,
  ) {}

  async create(name: string, userId: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('groups')
      .insert([{ name, created_by: userId }])
      .select('id') // 👈 Aggiungi questa selezione per restituire l'ID del gruppo
      .single();

    if (error || !data)
      throw new Error(
        error?.message || 'Errore durante la creazione del gruppo',
      );

    await this.supabase
      .getClient()
      .from('group_members')
      .insert([{ group_id: data.id, user_id: userId, role: 'admin' }]);

    return data;
  }

  async findAll(userId: string) {
    const { data: groupIds, error } = await this.supabase
      .getClient()
      .from('group_members')
      .select('group_id')
      .eq('user_id', userId);

    if (error || !groupIds)
      throw new Error(error?.message || 'Errore nel recupero gruppi');

    const { data, error: fetchError } = await this.supabase
      .getClient()
      .from('groups')
      .select('*')
      .in(
        'id',
        groupIds.map((g) => g.group_id),
      );

    if (fetchError) throw new Error(fetchError.message);
    return data;
  }

  async getUserGroups(userId: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('groups')
      .select(
        `
      id, name, created_at,
      group_members(role)
    `,
      )
      .eq('group_members.user_id', userId);

    if (error) throw new Error(error.message);
    return data;
  }

  async deleteGroup(groupId: string, userId: string) {
    // Controlla se il gruppo ha spese attive
    const { data: expenses } = await this.supabase
      .getClient()
      .from('expenses')
      .select('id')
      .eq('group_id', groupId);

    if (!expenses || expenses.length > 0) {
      throw new ForbiddenException(
        'Non puoi eliminare un gruppo con spese attive',
      );
    }

    // Controlla se l'utente è admin
    const { data: membership } = await this.supabase
      .getClient()
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .single();

    if (!membership || membership.role !== 'admin') {
      throw new ForbiddenException('Solo un admin può eliminare il gruppo');
    }

    await this.supabase.getClient().from('groups').delete().eq('id', groupId);
    return { message: 'Gruppo eliminato con successo' };
  }

  async remove(groupId: string, userId: string) {
    // Controlla se l'utente è admin
    const { data } = await this.supabase
      .getClient()
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .single();

    if (!data || data.role !== 'admin')
      throw new ForbiddenException(
        'Solo gli admin possono eliminare il gruppo',
      );

    // Elimina il gruppo
    await this.supabase.getClient().from('groups').delete().eq('id', groupId);
    return { message: 'Gruppo eliminato' };
  }

  async addMember(
    groupId: string,
    userId: string,
    role: string,
    adminId: string,
  ) {
    // Controlla se chi aggiunge è admin
    const { data } = await this.supabase
      .getClient()
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', adminId)
      .single();
    if (!data || data.role !== 'admin')
      throw new ForbiddenException('Solo gli admin possono aggiungere membri');

    // Aggiunge il membro
    await this.supabase
      .getClient()
      .from('group_members')
      .insert([{ group_id: groupId, user_id: userId, role }]);
    return { message: 'Membro aggiunto' };
  }

  async removeMember(groupId: string, userId: string, adminId: string) {
    // Controlla se chi rimuove è admin
    const { data } = await this.supabase
      .getClient()
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', adminId)
      .single();
    if (!data || data.role !== 'admin')
      throw new ForbiddenException('Solo gli admin possono rimuovere membri');

    await this.supabase
      .getClient()
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', userId);
    return { message: 'Membro rimosso' };
  }

  async getMembers(groupId: string, userId: string) {
    // Controlla se l'utente è membro del gruppo
    const { data } = await this.supabase
      .getClient()
      .from('group_members')
      .select('id')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .single();
    if (!data) throw new ForbiddenException('Non hai accesso a questo gruppo');

    return this.supabase
      .getClient()
      .from('group_members')
      .select('*')
      .eq('group_id', groupId);
  }

  async updateRole(
    groupId: string,
    userId: string,
    role: string,
    adminId: string,
  ) {
    // Controlla se chi modifica è admin
    const { data } = await this.supabase
      .getClient()
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', adminId)
      .single();
    if (!data || data.role !== 'admin')
      throw new ForbiddenException('Solo gli admin possono modificare i ruoli');

    await this.supabase
      .getClient()
      .from('group_members')
      .update({ role })
      .eq('group_id', groupId)
      .eq('user_id', userId);
    return { message: 'Ruolo aggiornato' };
  }

  async createInvite(
    userId: string,
    createInviteDto: { groupId: string; inviteeEmail: string; role?: string },
  ) {
    // Controlla se l'utente che invita è admin
    const { data: membership } = await this.supabase
      .getClient()
      .from('group_members')
      .select('role')
      .eq('group_id', createInviteDto.groupId)
      .eq('user_id', userId)
      .single();

    if (!membership || membership.role !== 'admin') {
      throw new ForbiddenException('Solo gli admin possono invitare membri');
    }

    // Controlla se l'utente è già membro del gruppo
    const { data: existingUser } = await this.supabase
      .getClient()
      .from('auth.users')
      .select('id')
      .eq('email', createInviteDto.inviteeEmail)
      .single();

    if (existingUser) {
      const { data: existingMember } = await this.supabase
        .getClient()
        .from('group_members')
        .select('id')
        .eq('group_id', createInviteDto.groupId)
        .eq('user_id', existingUser.id)
        .single();

      if (existingMember) {
        throw new ConflictException('L’utente è già membro del gruppo');
      }
    }

    // Controlla se esiste già un invito pendente
    const { data: existingInvite } = await this.supabase
      .getClient()
      .from('group_invites')
      .select('id')
      .eq('group_id', createInviteDto.groupId)
      .eq('invitee_email', createInviteDto.inviteeEmail)
      .eq('status', 'pending')
      .single();

    if (existingInvite) {
      throw new ConflictException(
        'Un invito è già stato inviato a questa email',
      );
    }

    // Genera il token dell'invito
    const inviteId = uuidv4();

    // Salva l'invito nel database
    await this.supabase
      .getClient()
      .from('group_invites')
      .insert([
        {
          id: inviteId,
          group_id: createInviteDto.groupId,
          inviter_id: userId,
          invitee_email: createInviteDto.inviteeEmail,
          role: createInviteDto.role || 'member',
        },
      ]);

    // Genera il link di invito
    const inviteUrl = `${this.configService.get('FRONTEND_URL')}/invites/${inviteId}`;

    return { message: 'Invito generato con successo', inviteUrl };
  }

  async acceptInvite(inviteId: string, userId: string) {
    // Trova l'invito
    const { data: invite } = await this.supabase
      .getClient()
      .from('group_invites')
      .select('*')
      .eq('id', inviteId)
      .eq('status', 'pending')
      .single();

    if (!invite) {
      throw new NotFoundException('Invito non trovato o già accettato');
    }

    // Aggiungi l'utente al gruppo
    await this.supabase
      .getClient()
      .from('group_members')
      .insert([
        { group_id: invite.group_id, user_id: userId, role: invite.role },
      ]);

    // Aggiorna l'invito a "accepted"
    await this.supabase
      .getClient()
      .from('group_invites')
      .update({ status: 'accepted' })
      .eq('id', inviteId);

    return { message: 'Hai accettato l’invito e sei stato aggiunto al gruppo' };
  }

  async getSentInvites(userId: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('group_invites')
      .select(
        `
      id, 
      group_id, 
      invitee_email, 
      role, 
      status, 
      created_at, 
      expires_at,
      groups (name)
    `,
      )
      .eq('inviter_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Errore nel recupero degli inviti: ${error.message}`);
    }

    return data;
  }

  async expireOldInvites() {
    // Cancella gli inviti scaduti dopo 24 ore
    const { error } = await this.supabase
      .getClient()
      .from('group_invites')
      .delete()
      .lt('expires_at', new Date().toISOString());

    if (error) {
      console.error(
        'Errore nella cancellazione degli inviti scaduti:',
        error.message,
      );
    }
  }
}
