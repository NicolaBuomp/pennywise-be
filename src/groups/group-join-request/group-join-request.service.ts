import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';

@Injectable()
export class GroupJoinRequestsService {
  constructor(private supabaseService: SupabaseService) {}

  /**
   * Richiedi di entrare in un gruppo pubblico
   */
  async requestToJoin(groupId: string, userId: string, message = '') {
    // Verifica che il gruppo esista ed è pubblico
    const { data: group, error: groupError } = await this.supabaseService
      .getClient()
      .from('groups')
      .select('*')
      .eq('id', groupId)
      .eq('privacy_type', 'public')
      .single();

    if (groupError || !group) {
      throw new NotFoundException('Gruppo non trovato o non accessibile');
    }

    // Verifica se l'utente è già membro del gruppo
    const { data: existingMembership, error: membershipError } =
      await this.supabaseService
        .getClient()
        .from('group_members')
        .select()
        .eq('group_id', groupId)
        .eq('user_id', userId)
        .maybeSingle();

    if (existingMembership) {
      throw new ForbiddenException('Sei già membro di questo gruppo');
    }

    // Verifica se esiste già una richiesta in sospeso
    const { data: existingRequest, error: requestError } =
      await this.supabaseService
        .getClient()
        .from('group_join_requests')
        .select()
        .eq('group_id', groupId)
        .eq('user_id', userId)
        .eq('status', 'pending')
        .maybeSingle();

    if (existingRequest) {
      throw new ForbiddenException(
        'Hai già una richiesta in sospeso per questo gruppo',
      );
    }

    // Crea la richiesta
    const { data: joinRequest, error } = await this.supabaseService
      .getClient()
      .from('group_join_requests')
      .insert({
        group_id: groupId,
        user_id: userId,
        message,
        status: 'pending',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new Error(
        `Errore nella creazione della richiesta: ${error.message}`,
      );
    }

    return {
      success: true,
      message: `Richiesta inviata al gruppo ${group.name}`,
      request: joinRequest,
    };
  }

  /**
   * Ottieni tutte le richieste di adesione per un gruppo
   */
  async getGroupJoinRequests(groupId: string, userId: string) {
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
        'Solo gli amministratori possono visualizzare le richieste di adesione',
      );
    }

    // Ottieni le richieste
    const { data: requests, error } = await this.supabaseService
      .getClient()
      .from('group_join_requests')
      .select(
        `
        *,
        requester:user_id(id, display_name, avatar_url)
      `,
      )
      .eq('group_id', groupId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Errore nel recupero delle richieste: ${error.message}`);
    }

    return requests || [];
  }

  /**
   * Ottieni le richieste di adesione inviate da un utente
   */
  async getUserJoinRequests(userId: string) {
    const { data: requests, error } = await this.supabaseService
      .getClient()
      .from('group_join_requests')
      .select(
        `
        *,
        group:group_id(id, name, avatar_url, member_count)
      `,
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Errore nel recupero delle richieste: ${error.message}`);
    }

    return requests || [];
  }

  /**
   * Rispondi a una richiesta di adesione (approva/rifiuta)
   */
  async respondToJoinRequest(
    requestId: string,
    userId: string,
    approved: boolean,
  ) {
    // Trova la richiesta
    const { data: request, error: requestError } = await this.supabaseService
      .getClient()
      .from('group_join_requests')
      .select(
        `
        *,
        group:group_id(id, name, member_count)
      `,
      )
      .eq('id', requestId)
      .eq('status', 'pending')
      .single();

    if (requestError || !request) {
      throw new NotFoundException('Richiesta non trovata o già elaborata');
    }

    // Verifica che l'utente sia admin del gruppo
    const { data: membership, error: membershipError } =
      await this.supabaseService
        .getClient()
        .from('group_members')
        .select()
        .eq('group_id', request.group_id)
        .eq('user_id', userId)
        .eq('role', 'admin')
        .maybeSingle();

    if (!membership) {
      throw new ForbiddenException(
        'Solo gli amministratori possono rispondere alle richieste',
      );
    }

    // Aggiorna lo stato della richiesta
    const status = approved ? 'approved' : 'rejected';
    const { error: updateError } = await this.supabaseService
      .getClient()
      .from('group_join_requests')
      .update({
        status,
        responded_by: userId,
        responded_at: new Date().toISOString(),
      })
      .eq('id', requestId);

    if (updateError) {
      throw new Error(
        `Errore nell'aggiornamento della richiesta: ${updateError.message}`,
      );
    }

    // Se approvata, aggiungi l'utente al gruppo
    if (approved) {
      const { error: addError } = await this.supabaseService
        .getClient()
        .from('group_members')
        .insert({
          group_id: request.group_id,
          user_id: request.user_id,
          role: 'member',
          joined_at: new Date().toISOString(),
        });

      if (addError) {
        throw new Error(
          `Errore nell'aggiunta dell'utente al gruppo: ${addError.message}`,
        );
      }

      // Aggiorna il conteggio membri del gruppo
      const { error: groupUpdateError } = await this.supabaseService
        .getClient()
        .from('groups')
        .update({
          member_count: request.group.member_count + 1,
        })
        .eq('id', request.group_id);

      if (groupUpdateError) {
        console.error(
          `Errore nell'aggiornamento del conteggio membri: ${groupUpdateError.message}`,
        );
        // Non blocchiamo l'operazione se questo fallisce
      }
    }

    return {
      success: true,
      message: approved
        ? `Richiesta approvata, l'utente è stato aggiunto al gruppo`
        : 'Richiesta rifiutata',
      status,
    };
  }

  /**
   * Cancella una richiesta di adesione inviata
   */
  async cancelJoinRequest(requestId: string, userId: string) {
    // Trova la richiesta
    const { data: request, error: requestError } = await this.supabaseService
      .getClient()
      .from('group_join_requests')
      .select()
      .eq('id', requestId)
      .eq('user_id', userId) // Solo l'utente che ha inviato può cancellare
      .eq('status', 'pending')
      .single();

    if (requestError || !request) {
      throw new NotFoundException('Richiesta non trovata o già elaborata');
    }

    // Cancella la richiesta
    const { error } = await this.supabaseService
      .getClient()
      .from('group_join_requests')
      .delete()
      .eq('id', requestId);

    if (error) {
      throw new Error(
        `Errore nella cancellazione della richiesta: ${error.message}`,
      );
    }

    return {
      success: true,
      message: 'Richiesta cancellata con successo',
    };
  }
}
