import { Injectable, ForbiddenException } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';

@Injectable()
export class GroupAuthService {
  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Verifica se un utente è admin di un gruppo
   */
  async verifyUserIsAdmin(groupId: string, userId: string): Promise<boolean> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      throw new ForbiddenException('User is not a member of this group');
    }

    if (data.role !== 'admin') {
      throw new ForbiddenException('User is not an admin of this group');
    }

    return true;
  }
}
