import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { randomBytes } from 'crypto';

@Injectable()
export class GroupInvitesService {
  constructor(private supabaseService: SupabaseService) {}

  /**
   * Genera un nuovo link di invito per un gruppo
   */
  async createInvite(
    groupId: string,
    userId: string,
    expiresInDays = 7,
    maxUses = 1,
  ) {
    // Verifica che l'utente sia admin del gruppo
    const { data: membership, error: membershipError } =
      await this.supabaseService
        .getClient()
        .from('group_members')
        .select()
        .eq('group_id', groupId)
        .eq('user_id', userId)
        .eq('role', 'admin')
        .maybeSingle();

    if (!membership) {
      throw new ForbiddenException(
        'Solo gli amministratori possono creare inviti per il gruppo',
      );
    }

    // Genera un token casuale
    const inviteToken = randomBytes(16).toString('hex');

    // Calcola la data di scadenza
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    // Crea l'invito
    const { data: invite, error } = await this.supabaseService
      .getClient()
      .from('group_invites')
      .insert({
        group_id: groupId,
        created_by: userId,
        invite_token: inviteToken,
        expires_at: expiresAt.toISOString(),
        max_uses: maxUses,
        uses: 0,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Errore nella creazione dell'invito: ${error.message}`);
    }

    return {
      ...invite,
      inviteUrl: `${process.env.APP_URL || 'pennywise://app'}/join/${inviteToken}`,
    };
  }

  /**
   * Ottieni tutti gli inviti attivi per un gruppo
   */
  async getGroupInvites(groupId: string, userId: string) {
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
        'Solo i membri possono visualizzare gli inviti del gruppo',
      );
    }

    // Ottieni gli inviti attivi
    const { data: invites, error } = await this.supabaseService
      .getClient()
      .from('group_invites')
      .select(
        `
        *,
        creator:created_by(id, first_name, last_name, avatar_url)
      `,
      )
      .eq('group_id', groupId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Errore nel recupero degli inviti: ${error.message}`);
    }

    // Formatta i risultati per includere un nome visualizzato
    const formattedInvites = (invites || []).map((invite) => {
      const creator = invite.creator && invite.creator[0];
      return {
        ...invite,
        creator: creator
          ? {
              ...creator,
              display_name:
                creator.first_name && creator.last_name
                  ? `${creator.first_name} ${creator.last_name}`
                  : 'Utente sconosciuto',
            }
          : null,
      };
    });

    return formattedInvites;
  }

  /**
   * Utilizza un invito per unirsi a un gruppo
   */
  async useInvite(inviteToken: string, userId: string) {
    // Trova l'invito
    const { data: invite, error: inviteError } = await this.supabaseService
      .getClient()
      .from('group_invites')
      .select(
        `
        *,
        group:group_id(*)
      `,
      )
      .eq('invite_token', inviteToken)
      .eq('is_active', true)
      .single();

    if (inviteError || !invite) {
      throw new NotFoundException('Invito non trovato o non valido');
    }

    // Verifica se l'invito è scaduto
    if (new Date(invite.expires_at) < new Date()) {
      throw new ForbiddenException('Invito scaduto');
    }

    // Verifica se l'invito ha raggiunto il numero massimo di utilizzi
    if (invite.uses >= invite.max_uses) {
      throw new ForbiddenException(
        'Invito già utilizzato il numero massimo di volte',
      );
    }

    // Verifica se l'utente è già membro del gruppo
    const { data: existingMembership, error: membershipError } =
      await this.supabaseService
        .getClient()
        .from('group_members')
        .select()
        .eq('group_id', invite.group_id)
        .eq('user_id', userId)
        .maybeSingle();

    if (existingMembership) {
      throw new ForbiddenException('Sei già membro di questo gruppo');
    }

    // Aggiungi l'utente al gruppo
    const { data: membership, error: addError } = await this.supabaseService
      .getClient()
      .from('group_members')
      .insert({
        group_id: invite.group_id,
        user_id: userId,
        role: 'member',
        joined_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (addError) {
      throw new Error(`Errore nell'aggiunta al gruppo: ${addError.message}`);
    }

    // Aggiorna il contatore di utilizzi dell'invito
    const newUses = invite.uses + 1;
    const isStillActive = newUses < invite.max_uses;

    const { error: updateError } = await this.supabaseService
      .getClient()
      .from('group_invites')
      .update({
        uses: newUses,
        is_active: isStillActive,
      })
      .eq('id', invite.id);

    if (updateError) {
      console.error(
        `Errore nell'aggiornamento dell'invito: ${updateError.message}`,
      );
      // Non blocchiamo l'operazione se questo fallisce
    }

    // Aggiorna il conteggio membri del gruppo
    const { error: groupUpdateError } = await this.supabaseService
      .getClient()
      .from('groups')
      .update({
        member_count: invite.group.member_count + 1,
      })
      .eq('id', invite.group_id);

    if (groupUpdateError) {
      console.error(
        `Errore nell'aggiornamento del conteggio membri: ${groupUpdateError.message}`,
      );
      // Non blocchiamo l'operazione se questo fallisce
    }

    return {
      success: true,
      message: `Ti sei unito al gruppo ${invite.group.name}`,
      group: invite.group,
    };
  }

  /**
   * Revoca un invito esistente
   */
  async revokeInvite(inviteId: string, userId: string) {
    // Trova l'invito
    const { data: invite, error: inviteError } = await this.supabaseService
      .getClient()
      .from('group_invites')
      .select(
        `
        *,
        group:group_id(id)
      `,
      )
      .eq('id', inviteId)
      .single();

    if (inviteError || !invite) {
      throw new NotFoundException('Invito non trovato');
    }

    // Verifica che l'utente sia admin del gruppo
    const { data: membership, error: membershipError } =
      await this.supabaseService
        .getClient()
        .from('group_members')
        .select()
        .eq('group_id', invite.group_id)
        .eq('user_id', userId)
        .eq('role', 'admin')
        .maybeSingle();

    if (!membership) {
      throw new ForbiddenException(
        'Solo gli amministratori possono revocare gli inviti',
      );
    }

    // Disattiva l'invito
    const { error: updateError } = await this.supabaseService
      .getClient()
      .from('group_invites')
      .update({
        is_active: false,
      })
      .eq('id', inviteId);

    if (updateError) {
      throw new Error(
        `Errore nella revoca dell'invito: ${updateError.message}`,
      );
    }

    return {
      success: true,
      message: 'Invito revocato con successo',
    };
  }
}
