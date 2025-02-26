import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class RealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private logger = new Logger('RealtimeGateway');

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinGroup')
  handleJoinGroup(client: Socket, groupId: string) {
    client.join(`group-${groupId}`);
    return { event: 'joinedGroup', data: groupId };
  }

  @SubscribeMessage('leaveGroup')
  handleLeaveGroup(client: Socket, groupId: string) {
    client.leave(`group-${groupId}`);
    return { event: 'leftGroup', data: groupId };
  }

  @SubscribeMessage('updateShoppingList')
  handleShoppingListUpdate(
    client: Socket,
    data: { groupId: string; listId: string; action: string },
  ) {
    client.to(`group-${data.groupId}`).emit('shoppingListUpdated', data);
    return { event: 'shoppingListUpdated', data };
  }

  @SubscribeMessage('updateExpense')
  handleExpenseUpdate(
    client: Socket,
    data: { groupId: string; expenseId: string; action: string },
  ) {
    client.to(`group-${data.groupId}`).emit('expenseUpdated', data);
    return { event: 'expenseUpdated', data };
  }
}
