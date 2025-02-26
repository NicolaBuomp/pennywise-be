// notifications/notifications.service.ts
import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly supabase: SupabaseService) {}

  async createNotification(
    userId: string,
    message: string,
    type: string,
    data: any = {},
  ) {
    return this.supabase
      .getClient()
      .from('notifications')
      .insert([
        {
          user_id: userId,
          message,
          type,
          data,
          read: false,
        },
      ]);
  }

  async notifyGroupMembers(
    groupId: string,
    message: string,
    type: string,
    data: any = {},
    excludeUserId?: string,
  ) {
    // Recupera tutti i membri del gruppo
    const { data: members } = await this.supabase
      .getClient()
      .from('group_members')
      .select('user_id')
      .eq('group_id', groupId);

    if (!members) return;

    // Crea notifiche per ciascun membro (tranne l'utente escluso)
    const notifications = members
      .filter((m) => m.user_id !== excludeUserId)
      .map((m) => ({
        user_id: m.user_id,
        message,
        type,
        data,
        read: false,
      }));

    if (notifications.length > 0) {
      await this.supabase
        .getClient()
        .from('notifications')
        .insert(notifications);
    }
  }

  async markAsRead(notificationId: string, userId: string) {
    return this.supabase
      .getClient()
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId)
      .eq('user_id', userId);
  }
}
