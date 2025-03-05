import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class GroupJoinRequestsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Gli utenti possono fare richiesta di ingresso a un gruppo usando il suo ID
   * Se il gruppo è protetto da password, verifica la password
   */
  async createJoinRequest(groupId: string, userId: string, password?: string) {
    // 1. Verifica che il gruppo esista e controlla se richiede password
    const { data: group, error: groupError } = await this.supabaseService
      .getClient()
      .from('groups')
      .select('id, require_password, password_hash')
      .eq('id', groupId)
      .single();

    if (groupError || !group) {
      throw new NotFoundException('Gruppo non trovato');
    }

    // Verifica della password se il gruppo è protetto
    if (group.require_password) {
      // Se il gruppo richiede password ma non è stata fornita
      if (!password) {
        throw new ForbiddenException('Questo gruppo richiede una password');
      }

      // Verifica che la password sia corretta
      const passwordMatch = await bcrypt.compare(password, group.password_hash);
      if (!passwordMatch) {
        throw new ForbiddenException('Password non valida');
      }
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
        .select('id, user_id, status, created_at')
        .eq('group_id', groupId)
        .eq('status', 'pending');

    if (requestsError) {
      throw new Error('Errore nel recupero delle richieste di ingresso');
    }

    if (!joinRequests || joinRequests.length === 0) {
      return [];
    }

    // Estrai gli ID degli utenti
    const userIds = joinRequests.map((request) => request.user_id);

    // Recupera i dati degli utenti in batch
    const usersData = await this.supabaseService.getUsersByIds(userIds);

    // Formatta i risultati combinando i dati delle richieste con i dati utente
    return joinRequests.map((request) => {
      const userData = usersData.find((u) => u.id === request.user_id) || {
        id: request.user_id,
        first_name: '',
        last_name: '',
        full_name: 'Utente sconosciuto',
        phone_number: null,
        avatar_url: null,
      };

      return {
        id: request.id,
        user_id: request.user_id,
        status: request.status,
        created_at: request.created_at,
        user_info: {
          id: userData.id,
          first_name: userData.first_name,
          last_name: userData.last_name,
          full_name: userData.full_name,
          phone_number: userData.phone_number,
          avatar_url: userData.avatar_url,
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
