import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class RealtimeGateway {
  @WebSocketServer()
  server: Server;

  @SubscribeMessage('update')
  handleUpdate(@MessageBody() data: any): void {
    this.server.emit('update', data);
  }
}