import { Injectable } from '@nestjs/common';
import { Room } from '../types';
import {
  ConnectedResponse,
  CreateRoomDto,
  CreateRoomResponse,
  DisconnectedResponse,
  RoomStatus,
  JoinRoomResponse,
  JoinRoomDto,
  LeaveRoomDto,
  LeaveRoomResponse,
  DeleteRoomResponse,
} from '../dto';
import { RoomManager } from '../utils';
import {
  PlayerAlreadyInRoomException,
  PlayerNotFoundException,
  PlayerNotInRoomException,
  RoomFullException,
  RoomNotFoundException,
} from '../exceptions';
import { randomUUID } from 'crypto';

@Injectable()
export class RoomsService {
  private roomManager: RoomManager;

  constructor() {
    this.roomManager = new RoomManager();
  }

  public handleConnection(socketId: string): ConnectedResponse {
    return {
      message: 'Player connected',
      socketId,
    };
  }

  public handleDisconnect(socketId: string): DisconnectedResponse {
    const player = this.roomManager.getPlayer(socketId);

    if (player) {
      this.roomManager.removePlayer(player.socketId);

      if (player.roomId) {
        const room: Room | undefined = this.roomManager.getRoom(player.roomId);

        if (room) {
          if (room.owner === player.playerId) {
            this.roomManager.removeRoom(room.id);
          } else {
            this.roomManager.removePlayerFromRoom(room.id, player.playerId);
          }
        }
      }
    }

    return {
      message: 'Player disconnected',
      socketId,
    };
  }

  public handleCreateRoom(
    socketId: string,
    data: CreateRoomDto,
  ): CreateRoomResponse {
    const { playerId, options } = data;
    const player = this.roomManager.getPlayer(socketId);

    if (!player || player.playerId !== playerId) {
      throw new PlayerNotFoundException();
    }

    if (player.roomId) {
      throw new PlayerAlreadyInRoomException();
    }

    const newRoom: Room = {
      id: randomUUID(),
      owner: playerId,
      players: [playerId],
      maxPlayers: options.maxPlayers,
      status: RoomStatus.WAITING,
      betAmount: options.betAmount,
    };

    this.roomManager.addRoom(newRoom);
    this.roomManager.setPlayer(socketId, playerId, newRoom.id);

    return newRoom;
  }

  public handleJoinRoom(socketId: string, data: JoinRoomDto): JoinRoomResponse {
    const player = this.roomManager.getPlayer(socketId);
    if (!player || player.playerId !== data.playerId) {
      throw new PlayerNotFoundException();
    }

    if (player.roomId) {
      throw new PlayerAlreadyInRoomException();
    }

    const room = this.roomManager.getRoom(data.roomId);
    if (!room) {
      throw new RoomNotFoundException();
    }

    if (room.players.length >= room.maxPlayers) {
      throw new RoomFullException();
    }

    this.roomManager.setPlayer(socketId, player.playerId, data.roomId);

    const updatedRoom: Room = {
      ...room,
      players: [...room.players, player.playerId],
    };

    this.roomManager.updateRoom(updatedRoom);

    return {
      roomId: data.roomId,
      players: updatedRoom.players,
      status: RoomStatus.WAITING,
    };
  }

  public handleLeaveRoom(
    socketId: string,
    data: LeaveRoomDto,
  ): LeaveRoomResponse | DeleteRoomResponse {
    const player = this.roomManager.getPlayer(socketId);
    if (!player || player.playerId !== data.playerId) {
      throw new PlayerNotFoundException();
    }

    if (!player.roomId) {
      throw new PlayerNotInRoomException();
    }

    const room = this.roomManager.getRoom(player.roomId);
    if (!room) {
      throw new RoomNotFoundException();
    }

    if (room.owner === player.playerId || room.players.length === 1) {
      this.roomManager.removeRoom(room.id);
      return { roomId: room.id };
    } else {
      const updatedRoom: Room = {
        ...room,
        players: room.players.filter(
          (playerId) => playerId !== player.playerId,
        ),
      };

      this.roomManager.updateRoom(updatedRoom);
      return {
        roomId: room.id,
        players: updatedRoom.players,
        status: RoomStatus.WAITING,
      };
    }
  }

  
}
