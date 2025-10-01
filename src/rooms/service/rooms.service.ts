import { Injectable } from '@nestjs/common';
import { Player, Room } from '../types';
import {
  CreateRoomDto,
  CreateRoomResponse,
  DisconnectedResponse,
  JoinRoomDto,
  LeaveRoomDto,
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
      // Just remove the player from the socket mapping
      // Keep their room association for reconnection
      this.roomManager.disconnectPlayer(socketId);
    }

    return {
      message: 'Player disconnected',
      socketId,
    };
  }

  public handleRegisterPlayer(
    socketId: string,
    data: RegisterPlayerDto,
  ): { player: Player; room?: Room } {
    const { playerId } = data;

    // Check if player already exists with a different socket ID
    const existingPlayer = this.findPlayerByPlayerId(playerId);

    if (existingPlayer) {
      // Player exists, remove old socket mapping and add new one
      const oldSocketId = existingPlayer.socketId;
      if (oldSocketId !== socketId) {
        this.roomManager.disconnectPlayer(oldSocketId);
      }

      this.roomManager.updateSocketMapping(socketId, existingPlayer.playerId);
      const updatedPlayer: Player = { ...existingPlayer, socketId };
      this.roomManager.savePlayer(updatedPlayer);

      // Get their room if they're in one
      const room = existingPlayer.roomId
        ? this.roomManager.getRoom(existingPlayer.roomId)
        : undefined;

      return { player: updatedPlayer, room };
    } else {
      // New player, create them
      const newPlayer: Player = { socketId, playerId, roomId: null };
      this.roomManager.savePlayer(newPlayer);
      return { player: newPlayer };
    }
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
    // Get or create player
    let player = this.roomManager.getPlayer(socketId);

    if (!player || player.playerId !== data.playerId) {
      // Check if player exists with different socket ID (reconnection)
      const existingPlayer = this.findPlayerByPlayerId(data.playerId);

      if (existingPlayer) {
        // Player exists, update socket mapping
        const oldSocketId = existingPlayer.socketId;
        if (oldSocketId !== socketId) {
          this.roomManager.disconnectPlayer(oldSocketId);
        }
        this.roomManager.updateSocketMapping(socketId, existingPlayer.playerId);
        player = { ...existingPlayer, socketId };
        this.roomManager.savePlayer(player);
      } else {
        // New player, create them
        player = { socketId, playerId: data.playerId, roomId: null };
        this.roomManager.savePlayer(player);
      }
    }

    // If player is already in the same room, return the room (idempotent)
    if (player.roomId === data.roomId) {
      return this.roomManager.getRoom(data.roomId)!;
    }

    // If player is in a different room, throw error
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

    // Clear room association for all players in the room
    this.roomManager.clearRoomForAllPlayers(room.id);

    // Delete the room
    this.roomManager.deleteRoom(room.id);

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

  private findPlayerByPlayerId(playerId: string): Player | undefined {
    return this.roomManager.findPlayerByPlayerId(playerId);
  }
}
