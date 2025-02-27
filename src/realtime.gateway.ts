import { Logger } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { SupabaseService } from './supabase/supabase.service';

@WebSocketGateway({ cors: true })
export class RealtimeGateway {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(private readonly supabaseService: SupabaseService) {
    this.initializeRealtime();
  }

  private initializeRealtime() {
    const supabase = this.supabaseService.getClient();

    supabase
      .channel('realtime-updates')
      .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
        this.logger.log(`Realtime event received: ${JSON.stringify(payload)}`);
        this.server.emit('realtime-update', payload);
      })
      .subscribe();
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(
    @MessageBody() data: { channel: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(data.channel);
    this.logger.log(`Client ${client.id} subscribed to ${data.channel}`);
  }

  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(
    @MessageBody() data: { channel: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(data.channel);
    this.logger.log(`Client ${client.id} unsubscribed from ${data.channel}`);
  }
}
