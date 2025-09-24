import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { RoomsService } from '../service/rooms.service';
import { ClientToServerEvents, ServerToClientEvents } from '../types';
import {
  type JoinRoomDto,
  type CreateRoomDto,
  type LeaveRoomDto,
} from '../dto';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class RoomsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(private readonly roomsService: RoomsService) {}

  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket): void {
    client.emit(
      ServerToClientEvents.CONNECTED,
      this.roomsService.handleConnection(client.id),
    );
  }

  handleDisconnect(client: Socket): void {
    client.emit(
      ServerToClientEvents.DISCONNECTED,
      this.roomsService.handleDisconnect(client.id),
    );
  }

  @SubscribeMessage(ClientToServerEvents.CREATE_ROOM)
  handleCreateRoom(client: Socket, @MessageBody() data: CreateRoomDto): void {
    const response = this.roomsService.handleCreateRoom(client.id, data);
    this.server.emit(ServerToClientEvents.ROOM_CREATED, response);
  }

  @SubscribeMessage(ClientToServerEvents.JOIN_ROOM)
  handleJoinRoom(client: Socket, @MessageBody() data: JoinRoomDto): void {
    const response = this.roomsService.handleJoinRoom(client.id, data);
    this.server.emit(ServerToClientEvents.ROOM_UPDATED, response);
  }

  @SubscribeMessage(ClientToServerEvents.LEAVE_ROOM)
  handleLeaveRoom(client: Socket, @MessageBody() data: LeaveRoomDto): void {
    const response = this.roomsService.handleLeaveRoom(client.id, data);
    this.server.emit(ServerToClientEvents.ROOM_UPDATED, response);
  }
}
