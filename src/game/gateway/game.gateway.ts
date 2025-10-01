import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
} from '@nestjs/websockets';
import { UsePipes, ValidationPipe } from '@nestjs/common';
import type { Server, Socket } from 'socket.io';
import { GameService } from '../service';
import { ClientToServerEvents, ServerToClientEvents } from '../types';
import { PlayCardDto } from '../dto';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
@UsePipes(new ValidationPipe({ transform: true }))
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly gameService: GameService) {}

  handleConnection(): void {}

  handleDisconnect(): void {}

  @SubscribeMessage(ClientToServerEvents.PLAY_CARD)
  handlePlayCard(client: Socket, @MessageBody() data: PlayCardDto) {
    const response = this.gameService.playCard(client.id, data);
    this.server.emit(ServerToClientEvents.CARD_PLAYED, response);
  }
}
