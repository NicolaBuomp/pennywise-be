// group-invites.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from 'src/supabase/supabase.service';
import { v4 as uuidv4 } from 'uuid';
import { CreateInviteDto } from '../dto/create-invite.dto';

@Injectable()
export class GroupInvitesService {
  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Crea un invito per un gruppo
   */
  async createInvite(groupId: string, dto: CreateInviteDto) {
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
      throw new Error(`Errore nella creazione dell'invito: ${error.message}`);
    }

    return { inviteToken, expiresAt };
  }

  /**
   * Valida un invito tramite token
   */
  async validateInvite(inviteToken: string) {
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

    return invite;
  }
}
