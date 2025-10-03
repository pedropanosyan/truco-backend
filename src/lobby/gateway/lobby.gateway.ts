import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
  ConnectedSocket,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { LobbyService } from '../service/rooms.service';
import { ClientToServerEvents, ServerToClientEvents } from '../types';
import {
  type JoinRoomDto,
  type CreateRoomDto,
  type LeaveRoomDto,
  type StartGameDto,
  type RegisterPlayerDto,
  type DeleteRoomDto,
} from '../dto';
import { UsePipes, ValidationPipe } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
@UsePipes(new ValidationPipe({ transform: true }))
export class LobbyGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(private readonly roomsService: LobbyService) {}

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

  @SubscribeMessage(ClientToServerEvents.REGISTER_PLAYER)
  handleRegisterPlayer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: RegisterPlayerDto,
  ): void {
    try {
      const result = this.roomsService.handleRegisterPlayer(client.id, data);

      if (result.room) {
        this.server.emit(ServerToClientEvents.ROOM_UPDATED, result.room);
      }

      client.emit(
        ServerToClientEvents.ROOMS,
        this.roomsService.handleGetAllRooms(),
      );
    } catch (error) {
      client.emit(ServerToClientEvents.ERROR, {
        message: error.message,
        type: error.constructor.name,
        socketId: client.id,
      });
    }
  }

  @SubscribeMessage(ClientToServerEvents.CREATE_ROOM)
  handleCreateRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: CreateRoomDto,
  ): void {
    try {
      const response = this.roomsService.handleCreateRoom(client.id, data);
      this.server.emit(ServerToClientEvents.ROOM_CREATED, response);
    } catch (error) {
      client.emit(ServerToClientEvents.ERROR, {
        message: error.message,
        type: error.constructor.name,
        socketId: client.id,
      });
    }
  }

  @SubscribeMessage(ClientToServerEvents.JOIN_ROOM)
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: JoinRoomDto,
  ): void {
    try {
      const response = this.roomsService.handleJoinRoom(client.id, data);
      this.server.emit(ServerToClientEvents.ROOM_UPDATED, response);
    } catch (error) {
      client.emit(ServerToClientEvents.ERROR, {
        message: error.message,
        type: error.constructor.name,
        socketId: client.id,
      });
    }
  }

  @SubscribeMessage(ClientToServerEvents.LEAVE_ROOM)
  handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: LeaveRoomDto,
  ): void {
    try {
      this.server.emit(
        ServerToClientEvents.ROOM_UPDATED,
        this.roomsService.handleLeaveRoom(client.id, data),
      );
    } catch (error) {
      client.emit(ServerToClientEvents.ERROR, {
        message: error.message,
        type: error.constructor.name,
        socketId: client.id,
      });
    }
  }

  @SubscribeMessage(ClientToServerEvents.DELETE_ROOM)
  handleDeleteRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: DeleteRoomDto,
  ): void {
    try {
      this.server.emit(
        ServerToClientEvents.ROOM_DELETED,
        this.roomsService.handleDeleteRoom(client.id, data).roomId,
      );
    } catch (error) {
      client.emit(ServerToClientEvents.ERROR, {
        message: error.message,
        type: error.constructor.name,
        socketId: client.id,
      });
    }
  }

  @SubscribeMessage(ClientToServerEvents.START_GAME)
  handleStartGame(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: StartGameDto,
  ): void {
    try {
      const response = this.roomsService.handleStartGame(client.id, data);
      this.server.emit(ServerToClientEvents.GAME_STARTING, response);
    } catch (error) {
      client.emit(ServerToClientEvents.ERROR, {
        message: error.message,
        type: error.constructor.name,
        socketId: client.id,
      });
    }
  }
}
