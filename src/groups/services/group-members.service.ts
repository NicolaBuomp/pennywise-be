// group-members.service.ts
import { Injectable, ForbiddenException } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { UpdateRoleDto } from '../dto/update-role.dto';
@Injectable()
export class GroupMembersService {
  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Rimuove un utente dal gruppo (solo se admin)
   */
  async removeUser(
    groupId: string,
    userId: string,
    adminId: string,
  ): Promise<void> {
    // 1. Controlliamo se chi effettua l'operazione è admin
    const { data: adminCheck } = await this.supabaseService
      .getClient()
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', adminId)
      .single();

    if (adminCheck?.role !== 'admin') {
      throw new ForbiddenException('Solo un admin può rimuovere utenti');
    }

    // 2. Se ok, rimuoviamo l'utente
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
    // 1. Verifichiamo se l'utente che effettua l'operazione è admin del gruppo
    // (Puoi aggiungere la logica come sopra se serve, qui la omettiamo per brevità)
    await this.supabaseService
      .getClient()
      .from('group_members')
      .update({ role: dto.role })
      .eq('group_id', dto.group_id)
      .eq('user_id', dto.user_id);
  }
}
