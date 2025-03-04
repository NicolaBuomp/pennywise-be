import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';

@Injectable()
export class GroupJoinRequestsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Gli utenti possono fare richiesta di ingresso a un gruppo usando il suo ID
   */
  async createJoinRequest(groupId: string, userId: string) {
    // 1. Verifica che il gruppo esista
    const { data: group, error: groupError } = await this.supabaseService
      .getClient()
      .from('groups')
      .select('id')
      .eq('id', groupId)
      .single();

    if (groupError || !group) {
      throw new NotFoundException('Gruppo non trovato');
    }

    // 2. Verifica che l'utente non sia già membro del gruppo
    const { data: existingMember } = await this.supabaseService
      .getClient()
      .from('group_members')
      .select('id')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existingMember) {
      throw new ForbiddenException('Sei già membro di questo gruppo');
    }

    // 3. Verifica che non ci sia già una richiesta pendente
    const { data: existingRequest } = await this.supabaseService
      .getClient()
      .from('group_join_requests')
      .select('id, status')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .eq('status', 'pending')
      .maybeSingle();

    if (existingRequest) {
      throw new ForbiddenException(
        'Hai già una richiesta di ingresso pendente per questo gruppo',
      );
    }

    // 4. Crea la richiesta di ingresso (stato 'pending')
    const { data: request, error: requestError } = await this.supabaseService
      .getClient()
      .from('group_join_requests')
      .insert({
        group_id: groupId,
        user_id: userId,
        status: 'pending',
      })
      .select()
      .single();

    if (requestError) {
      throw new Error('Errore nella creazione della richiesta di ingresso');
    }

    return {
      message: 'Richiesta di ingresso creata con successo',
      request,
    };
  }

  /**
   * Recupera tutte le richieste di ingresso di un gruppo (solo admin)
   */
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
        .select(
          'id, user_id, status, created_at, profiles(id, first_name, last_name, full_name, phone_number, avatar_url)',
        )
        .eq('group_id', groupId)
        .eq('status', 'pending');

    if (requestsError) {
      throw new Error('Errore nel recupero delle richieste di ingresso');
    }

    // Formatta i risultati per includere le informazioni del profilo
    return joinRequests.map((request) => {
      const profile = Array.isArray(request.profiles)
        ? request.profiles[0]
        : request.profiles;

      return {
        id: request.id,
        user_id: request.user_id,
        status: request.status,
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

  /**
   * Approva o rifiuta una richiesta di ingresso
   */
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
