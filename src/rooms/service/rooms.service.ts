import { Injectable } from '@nestjs/common';
import { Player, Room } from '../types';
import {
  ConnectedResponse,
  CreateRoomDto,
  CreateRoomResponse,
  DisconnectedResponse,
  JoinRoomResponse,
  JoinRoomDto,
  LeaveRoomDto,
  LeaveRoomResponse,
  DeleteRoomResponse,
  StartGameDto,
  StartGameResponse,
  RegisterPlayerDto,
} from '../dto';
import { RoomManager } from '../utils';
import {
  PlayerAlreadyInRoomException,
  PlayerNotFoundException,
  PlayerNotInRoomException,
  RoomFullException,
  RoomNotFoundException,
  UnauthorizedRoomActionException,
} from '../exceptions';
import { randomUUID } from 'crypto';
import { GameService, StartGame } from 'src/game';

@Injectable()
export class RoomsService {
  constructor(
    private readonly roomManager: RoomManager,
    private readonly gameService: GameService,
  ) {}

  public handleConnection(socketId: string): Room[] {
    return this.roomManager.getRooms();
  }

  public handleDisconnect(socketId: string): DisconnectedResponse {
    const player = this.roomManager.getPlayer(socketId);

    if (player) {
      if (player.roomId) {
        const room = this.roomManager.getRoom(player.roomId);
        if (room) {
          // If owner disconnects, delete the room
          if (room.owner === player.playerId) {
            this.roomManager.deleteRoom(room.id);
          } else {
            // If non-owner disconnects, remove them from room
            const updatedRoom: Room = {
              ...room,
              players: room.players.filter((p) => p !== player.playerId),
            };
            this.roomManager.saveRoom(updatedRoom);
          }
        }

        // Update player to remove room association
        const updatedPlayer: Player = { ...player, roomId: null };
        this.roomManager.savePlayer(updatedPlayer);
      } else {
        // Just remove the player if they're not in a room
        this.roomManager.deletePlayer(socketId);
      }
    }

    return {
      message: 'Player disconnected',
      socketId,
    };
  }

  public handleRegisterPlayer(socketId: string, data: RegisterPlayerDto): void {
    const { playerId } = data;
    const player = this.roomManager.getPlayer(socketId);
    if (player) {
      throw new PlayerAlreadyInRoomException();
    }

    const newPlayer: Player = { socketId, playerId, roomId: null };
    this.roomManager.savePlayer(newPlayer);
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
      betAmount: options.betAmount,
      scoreLimit: options.scoreLimit,
    };

    // Save room
    this.roomManager.saveRoom(newRoom);

    // Update player to associate with room
    const updatedPlayer: Player = { ...player, roomId: newRoom.id };
    this.roomManager.savePlayer(updatedPlayer);

    return newRoom;
  }

  public handleJoinRoom(socketId: string, data: JoinRoomDto): Room {
    // Validate player exists and is not in a room
    const player = this.roomManager.getPlayer(socketId);
    if (!player || player.playerId !== data.playerId) {
      throw new PlayerNotFoundException();
    }

    if (player.roomId) {
      throw new PlayerAlreadyInRoomException();
    }

    // Validate room exists and has space
    const room = this.roomManager.getRoom(data.roomId);
    if (!room) {
      throw new RoomNotFoundException();
    }

    if (room.players.length >= room.maxPlayers) {
      throw new RoomFullException();
    }

    // Add player to room
    const updatedRoom: Room = {
      ...room,
      players: [...room.players, data.playerId],
    };

    // Update player to associate with room
    const updatedPlayer: Player = { ...player, roomId: data.roomId };

    // Save both changes
    this.roomManager.saveRoom(updatedRoom);
    this.roomManager.savePlayer(updatedPlayer);

    return updatedRoom;
  }

  public handleLeaveRoom(socketId: string, data: LeaveRoomDto): Room {
    // Validate player exists and is in a room
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

    // Only non-owner players can leave a room
    if (room.owner === data.playerId) {
      throw new UnauthorizedRoomActionException(
        'leave room (owners must delete room instead)',
      );
    }

    // Remove player from room
    const updatedRoom: Room = {
      ...room,
      players: room.players.filter((p) => p !== data.playerId),
    };

    // Update player to remove room association
    const updatedPlayer: Player = { ...player, roomId: null };

    // Save changes
    this.roomManager.saveRoom(updatedRoom);
    this.roomManager.savePlayer(updatedPlayer);

    return updatedRoom;
  }

  public handleDeleteRoom(
    socketId: string,
    data: LeaveRoomDto,
  ): DeleteRoomResponse {
    // Validate player exists and is in a room
    const player = this.roomManager.getPlayer(socketId);
    console.log('player', player);
    console.log('data', data);
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

    // Only room owners can delete a room
    if (room.owner !== data.playerId) {
      throw new UnauthorizedRoomActionException(
        'delete room (only room owners can delete rooms)',
      );
    }

    // Delete the room
    this.roomManager.deleteRoom(room.id);

    // Update player to remove room association
    const updatedPlayer: Player = { ...player, roomId: null };
    this.roomManager.savePlayer(updatedPlayer);

    return { roomId: room.id };
  }

  public handleStartGame(
    socketId: string,
    data: StartGameDto,
  ): StartGameResponse {
    const player = this.roomManager.getPlayer(socketId);
    if (!player || player.playerId !== data.playerId) {
      throw new PlayerNotFoundException();
    }

    const room = this.roomManager.getRoom(data.roomId);
    if (!room) {
      throw new RoomNotFoundException();
    }

    if (room.owner !== player.playerId) {
      throw new UnauthorizedRoomActionException('start game');
    }

    const startGame: StartGame = {
      roomId: room.id,
      players: room.players,
      betAmount: room.betAmount,
      scoreLimit: room.scoreLimit,
    };

    const gameState = this.gameService.startGame(startGame);
    return { gameState };
  }

  public handleGetAllRooms(): Room[] {
    return this.roomManager.getRooms();
  }

  // --- Private Business Logic Methods ---
}
