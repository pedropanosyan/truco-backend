import { Test, TestingModule } from '@nestjs/testing';
import { RoomsService } from './rooms.service';
import { RoomManager } from '../utils';
import { GameService } from 'src/game';
import {
  CreateRoomDto,
  JoinRoomDto,
  LeaveRoomDto,
  RegisterPlayerDto,
  StartGameDto,
} from '../dto';
import {
  PlayerAlreadyInRoomException,
  PlayerNotFoundException,
  PlayerNotInRoomException,
  RoomFullException,
  RoomNotFoundException,
  UnauthorizedRoomActionException,
} from '../exceptions';

describe('RoomsService', () => {
  let service: RoomsService;
  let roomManager: RoomManager;
  let gameService: GameService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomsService,
        RoomManager,
        {
          provide: GameService,
          useValue: {
            startGame: jest.fn().mockReturnValue({
              roomId: 'test-room',
              players: ['player1', 'player2'],
              betAmount: 10,
              hands: { player1: [], player2: [] },
              score: { player1: 0, player2: 0 },
              scoreLimit: 30,
            }),
          },
        },
      ],
    }).compile();

    service = module.get<RoomsService>(RoomsService);
    roomManager = module.get<RoomManager>(RoomManager);
    gameService = module.get<GameService>(GameService);
  });

  describe('handleConnection', () => {
    it('should return all rooms', () => {
      const rooms = service.handleConnection('test-socket');
      expect(Array.isArray(rooms)).toBe(true);
    });
  });

  describe('handleRegisterPlayer', () => {
    it('should register a new player', () => {
      const socketId = 'test-socket';
      const data: RegisterPlayerDto = { playerId: 'player-123' };

      const result = service.handleRegisterPlayer(socketId, data);

      expect(result).toEqual({
        player: {
          socketId,
          playerId: 'player-123',
          roomId: null,
        },
      });

      const player = roomManager.getPlayer(socketId);
      expect(player).toEqual({
        socketId,
        playerId: 'player-123',
        roomId: null,
      });
    });

    it('should reconnect existing player with new socket ID', () => {
      const originalSocketId = 'original-socket';
      const newSocketId = 'new-socket';
      const playerId = 'player-123';

      // Register player first time
      service.handleRegisterPlayer(originalSocketId, { playerId });

      // Register with new socket ID (simulating reconnection)
      const result = service.handleRegisterPlayer(newSocketId, { playerId });

      expect(result).toEqual({
        player: {
          socketId: newSocketId,
          playerId: 'player-123',
          roomId: null,
        },
      });

      // Original socket should no longer exist
      expect(roomManager.getPlayer(originalSocketId)).toBeUndefined();

      // New socket should exist
      expect(roomManager.getPlayer(newSocketId)).toEqual({
        socketId: newSocketId,
        playerId: 'player-123',
        roomId: null,
      });
    });

    it('should reconnect player to their existing room', () => {
      const originalSocketId = 'original-socket';
      const newSocketId = 'new-socket';
      const playerId = 'player-123';

      // Register player and create room
      service.handleRegisterPlayer(originalSocketId, { playerId });
      const room = service.handleCreateRoom(originalSocketId, {
        playerId,
        options: { maxPlayers: 4, betAmount: 10, scoreLimit: 100 },
      });

      // Register with new socket ID (simulating reconnection)
      const result = service.handleRegisterPlayer(newSocketId, { playerId });

      expect(result).toEqual({
        player: {
          socketId: newSocketId,
          playerId: 'player-123',
          roomId: room.id,
        },
        room: expect.objectContaining({
          id: room.id,
          owner: playerId,
          players: [playerId],
        }),
      });
    });
  });

  describe('handleCreateRoom', () => {
    it('should create a room and add owner as first player', () => {
      const socketId = 'test-socket';
      const playerId = 'player-123';

      // Register player first
      service.handleRegisterPlayer(socketId, { playerId });

      const data: CreateRoomDto = {
        playerId,
        options: {
          maxPlayers: 4,
          betAmount: 10,
          scoreLimit: 100,
        },
      };

      const result = service.handleCreateRoom(socketId, data);

      expect(result).toMatchObject({
        owner: playerId,
        players: [playerId],
        maxPlayers: 4,
        betAmount: 10,
        scoreLimit: 100,
      });
      expect(result.id).toBeDefined();

      // Verify player is associated with room
      const player = roomManager.getPlayer(socketId);
      expect(player?.roomId).toBe(result.id);
    });

    it('should throw error if player not found', () => {
      const data: CreateRoomDto = {
        playerId: 'player-123',
        options: { maxPlayers: 4, betAmount: 10, scoreLimit: 100 },
      };

      expect(() => {
        service.handleCreateRoom('test-socket', data);
      }).toThrow(PlayerNotFoundException);
    });

    it('should throw error if player already in room', () => {
      const socketId = 'test-socket';
      const playerId = 'player-123';

      // Register player and create room
      service.handleRegisterPlayer(socketId, { playerId });
      service.handleCreateRoom(socketId, {
        playerId,
        options: { maxPlayers: 4, betAmount: 10, scoreLimit: 100 },
      });

      // Try to create another room
      expect(() => {
        service.handleCreateRoom(socketId, {
          playerId,
          options: { maxPlayers: 4, betAmount: 10, scoreLimit: 100 },
        });
      }).toThrow(PlayerAlreadyInRoomException);
    });
  });

  describe('handleJoinRoom', () => {
    it('should successfully join a room', () => {
      const ownerSocketId = 'owner-socket';
      const playerSocketId = 'player-socket';
      const ownerId = 'owner-123';
      const playerId = 'player-123';

      // Setup owner and room
      service.handleRegisterPlayer(ownerSocketId, { playerId: ownerId });
      const room = service.handleCreateRoom(ownerSocketId, {
        playerId: ownerId,
        options: { maxPlayers: 4, betAmount: 10, scoreLimit: 100 },
      });

      // Register joining player
      service.handleRegisterPlayer(playerSocketId, { playerId });

      const data: JoinRoomDto = {
        playerId,
        roomId: room.id,
      };

      const result = service.handleJoinRoom(playerSocketId, data);

      expect(result).toMatchObject({
        id: room.id,
        players: [ownerId, playerId],
        owner: ownerId,
      });

      // Verify player is associated with room
      const player = roomManager.getPlayer(playerSocketId);
      expect(player?.roomId).toBe(room.id);
    });

    it('should auto-register player and throw error if room not found', () => {
      const data: JoinRoomDto = {
        playerId: 'player-123',
        roomId: 'test-room',
      };

      expect(() => {
        service.handleJoinRoom('test-socket', data);
      }).toThrow(RoomNotFoundException);
    });

    it('should throw error if player already in room', () => {
      const socketId = 'test-socket';
      const playerId = 'player-123';

      // Register player and create room
      service.handleRegisterPlayer(socketId, { playerId });
      const room = service.handleCreateRoom(socketId, {
        playerId,
        options: { maxPlayers: 4, betAmount: 10, scoreLimit: 100 },
      });

      // Try to join another room
      expect(() => {
        service.handleJoinRoom(socketId, {
          playerId,
          roomId: 'other-room',
        });
      }).toThrow(PlayerAlreadyInRoomException);
    });

    it('should allow rejoining the same room (idempotent)', () => {
      const socketId = 'test-socket';
      const playerId = 'player-123';
      const roomId = 'test-room';

      // Register player and create room
      service.handleRegisterPlayer(socketId, { playerId });
      const room = service.handleCreateRoom(socketId, {
        playerId,
        options: { maxPlayers: 4, betAmount: 10, scoreLimit: 100 },
      });

      // Try to join the same room again (should succeed)
      const result = service.handleJoinRoom(socketId, {
        playerId,
        roomId: room.id,
      });

      // Should return the same room without error
      expect(result).toEqual(room);
    });

    it('should throw error if room not found', () => {
      const socketId = 'test-socket';
      const playerId = 'player-123';

      service.handleRegisterPlayer(socketId, { playerId });

      expect(() => {
        service.handleJoinRoom(socketId, {
          playerId,
          roomId: 'non-existent-room',
        });
      }).toThrow(RoomNotFoundException);
    });

    it('should throw error if room is full', () => {
      const ownerSocketId = 'owner-socket';
      const ownerId = 'owner-123';

      // Create room with max 2 players
      service.handleRegisterPlayer(ownerSocketId, { playerId: ownerId });
      const room = service.handleCreateRoom(ownerSocketId, {
        playerId: ownerId,
        options: { maxPlayers: 2, betAmount: 10, scoreLimit: 100 },
      });

      // Add one more player
      const player1SocketId = 'player1-socket';
      const player1Id = 'player1-123';
      service.handleRegisterPlayer(player1SocketId, { playerId: player1Id });
      service.handleJoinRoom(player1SocketId, {
        playerId: player1Id,
        roomId: room.id,
      });

      // Try to add second player (room should be full)
      const player2SocketId = 'player2-socket';
      const player2Id = 'player2-123';
      service.handleRegisterPlayer(player2SocketId, { playerId: player2Id });

      expect(() => {
        service.handleJoinRoom(player2SocketId, {
          playerId: player2Id,
          roomId: room.id,
        });
      }).toThrow(RoomFullException);
    });
  });

  describe('handleLeaveRoom', () => {
    it('should leave room and return updated room when not owner', () => {
      const ownerSocketId = 'owner-socket';
      const playerSocketId = 'player-socket';
      const ownerId = 'owner-123';
      const playerId = 'player-123';

      // Setup room with two players
      service.handleRegisterPlayer(ownerSocketId, { playerId: ownerId });
      const room = service.handleCreateRoom(ownerSocketId, {
        playerId: ownerId,
        options: { maxPlayers: 4, betAmount: 10, scoreLimit: 100 },
      });

      service.handleRegisterPlayer(playerSocketId, { playerId });
      service.handleJoinRoom(playerSocketId, {
        playerId,
        roomId: room.id,
      });

      const data: LeaveRoomDto = {
        playerId,
        roomId: room.id,
      };

      const result = service.handleLeaveRoom(playerSocketId, data);

      expect(result).toMatchObject({
        id: room.id,
        players: [ownerId],
        owner: ownerId,
      });

      // Verify player is no longer in room
      const player = roomManager.getPlayer(playerSocketId);
      expect(player?.roomId).toBeNull();
    });

    it('should throw error if owner tries to leave room', () => {
      const socketId = 'test-socket';
      const playerId = 'player-123';

      // Create room
      service.handleRegisterPlayer(socketId, { playerId });
      const room = service.handleCreateRoom(socketId, {
        playerId,
        options: { maxPlayers: 4, betAmount: 10, scoreLimit: 100 },
      });

      const data: LeaveRoomDto = {
        playerId,
        roomId: room.id,
      };

      expect(() => {
        service.handleLeaveRoom(socketId, data);
      }).toThrow(UnauthorizedRoomActionException);
    });

    it('should throw error if player not found', () => {
      const data: LeaveRoomDto = {
        playerId: 'player-123',
        roomId: 'test-room',
      };

      expect(() => {
        service.handleLeaveRoom('test-socket', data);
      }).toThrow(PlayerNotFoundException);
    });

    it('should throw error if player not in room', () => {
      const socketId = 'test-socket';
      const playerId = 'player-123';

      service.handleRegisterPlayer(socketId, { playerId });

      expect(() => {
        service.handleLeaveRoom(socketId, {
          playerId,
          roomId: 'test-room',
        });
      }).toThrow(PlayerNotInRoomException);
    });
  });

  describe('handleDeleteRoom', () => {
    it('should delete room when owner requests it', () => {
      const socketId = 'test-socket';
      const playerId = 'player-123';

      // Create room
      service.handleRegisterPlayer(socketId, { playerId });
      const room = service.handleCreateRoom(socketId, {
        playerId,
        options: { maxPlayers: 4, betAmount: 10, scoreLimit: 100 },
      });

      const data: LeaveRoomDto = {
        playerId,
        roomId: room.id,
      };

      const result = service.handleDeleteRoom(socketId, data);

      expect(result).toEqual({ roomId: room.id });

      // Verify room no longer exists
      const roomAfterDelete = roomManager.getRoom(room.id);
      expect(roomAfterDelete).toBeUndefined();

      // Verify player is no longer in room
      const player = roomManager.getPlayer(socketId);
      expect(player?.roomId).toBeNull();
    });

    it('should throw error if non-owner tries to delete room', () => {
      const ownerSocketId = 'owner-socket';
      const playerSocketId = 'player-socket';
      const ownerId = 'owner-123';
      const playerId = 'player-123';

      // Setup room with two players
      service.handleRegisterPlayer(ownerSocketId, { playerId: ownerId });
      const room = service.handleCreateRoom(ownerSocketId, {
        playerId: ownerId,
        options: { maxPlayers: 4, betAmount: 10, scoreLimit: 100 },
      });

      service.handleRegisterPlayer(playerSocketId, { playerId });
      service.handleJoinRoom(playerSocketId, {
        playerId,
        roomId: room.id,
      });

      const data: LeaveRoomDto = {
        playerId,
        roomId: room.id,
      };

      expect(() => {
        service.handleDeleteRoom(playerSocketId, data);
      }).toThrow(UnauthorizedRoomActionException);
    });

    it('should throw error if player not found', () => {
      const data: LeaveRoomDto = {
        playerId: 'player-123',
        roomId: 'test-room',
      };

      expect(() => {
        service.handleDeleteRoom('test-socket', data);
      }).toThrow(PlayerNotFoundException);
    });

    it('should throw error if player not in room', () => {
      const socketId = 'test-socket';
      const playerId = 'player-123';

      service.handleRegisterPlayer(socketId, { playerId });

      expect(() => {
        service.handleDeleteRoom(socketId, {
          playerId,
          roomId: 'test-room',
        });
      }).toThrow(PlayerNotInRoomException);
    });

    it('should clear roomId for all players when room is deleted', () => {
      const ownerSocketId = 'owner-socket';
      const player1SocketId = 'player1-socket';
      const player2SocketId = 'player2-socket';
      const ownerId = 'owner-123';
      const player1Id = 'player1-123';
      const player2Id = 'player2-123';

      // Setup room with three players
      service.handleRegisterPlayer(ownerSocketId, { playerId: ownerId });
      const room = service.handleCreateRoom(ownerSocketId, {
        playerId: ownerId,
        options: { maxPlayers: 4, betAmount: 10, scoreLimit: 100 },
      });

      service.handleRegisterPlayer(player1SocketId, { playerId: player1Id });
      service.handleJoinRoom(player1SocketId, {
        playerId: player1Id,
        roomId: room.id,
      });

      service.handleRegisterPlayer(player2SocketId, { playerId: player2Id });
      service.handleJoinRoom(player2SocketId, {
        playerId: player2Id,
        roomId: room.id,
      });

      // Verify all players are in the room before deletion
      expect(roomManager.getPlayer(ownerSocketId)?.roomId).toBe(room.id);
      expect(roomManager.getPlayer(player1SocketId)?.roomId).toBe(room.id);
      expect(roomManager.getPlayer(player2SocketId)?.roomId).toBe(room.id);

      // Delete the room
      const result = service.handleDeleteRoom(ownerSocketId, {
        playerId: ownerId,
        roomId: room.id,
      });

      // Verify room is deleted
      expect(result).toEqual({ roomId: room.id });
      expect(roomManager.getRoom(room.id)).toBeUndefined();

      // Verify ALL players have their roomId cleared
      expect(roomManager.getPlayer(ownerSocketId)?.roomId).toBeNull();
      expect(roomManager.getPlayer(player1SocketId)?.roomId).toBeNull();
      expect(roomManager.getPlayer(player2SocketId)?.roomId).toBeNull();
    });
  });

  describe('handleStartGame', () => {
    it('should start game when owner requests it', () => {
      const socketId = 'test-socket';
      const playerId = 'player-123';

      // Create room
      service.handleRegisterPlayer(socketId, { playerId });
      const room = service.handleCreateRoom(socketId, {
        playerId,
        options: { maxPlayers: 4, betAmount: 10, scoreLimit: 100 },
      });

      const data: StartGameDto = {
        playerId,
        roomId: room.id,
      };

      const result = service.handleStartGame(socketId, data);

      expect(result).toHaveProperty('gameState');
      expect(gameService.startGame).toHaveBeenCalledWith({
        roomId: room.id,
        players: [playerId],
        betAmount: 10,
        scoreLimit: 100,
      });
    });

    it('should throw error if not owner', () => {
      const ownerSocketId = 'owner-socket';
      const playerSocketId = 'player-socket';
      const ownerId = 'owner-123';
      const playerId = 'player-123';

      // Create room
      service.handleRegisterPlayer(ownerSocketId, { playerId: ownerId });
      const room = service.handleCreateRoom(ownerSocketId, {
        playerId: ownerId,
        options: { maxPlayers: 4, betAmount: 10, scoreLimit: 100 },
      });

      // Add another player
      service.handleRegisterPlayer(playerSocketId, { playerId });
      service.handleJoinRoom(playerSocketId, {
        playerId,
        roomId: room.id,
      });

      expect(() => {
        service.handleStartGame(playerSocketId, {
          playerId,
          roomId: room.id,
        });
      }).toThrow(UnauthorizedRoomActionException);
    });
  });

  describe('handleDisconnect', () => {
    it('should handle disconnect gracefully when player not in room', () => {
      const socketId = 'test-socket';
      const playerId = 'player-123';

      service.handleRegisterPlayer(socketId, { playerId });

      const result = service.handleDisconnect(socketId);

      expect(result).toEqual({
        message: 'Player disconnected',
        socketId,
      });

      // Verify player is removed from socket mapping
      const player = roomManager.getPlayer(socketId);
      expect(player).toBeUndefined();
    });

    it('should keep room when owner disconnects (for reconnection)', () => {
      const socketId = 'test-socket';
      const playerId = 'player-123';

      // Create room
      service.handleRegisterPlayer(socketId, { playerId });
      const room = service.handleCreateRoom(socketId, {
        playerId,
        options: { maxPlayers: 4, betAmount: 10, scoreLimit: 100 },
      });

      const result = service.handleDisconnect(socketId);

      expect(result).toEqual({
        message: 'Player disconnected',
        socketId,
      });

      // Verify room still exists (for reconnection)
      const roomAfterDisconnect = roomManager.getRoom(room.id);
      expect(roomAfterDisconnect).toBeDefined();
      expect(roomAfterDisconnect?.players).toEqual([playerId]);
    });

    it('should keep room when non-owner disconnects (for reconnection)', () => {
      const ownerSocketId = 'owner-socket';
      const playerSocketId = 'player-socket';
      const ownerId = 'owner-123';
      const playerId = 'player-123';

      // Setup room with two players
      service.handleRegisterPlayer(ownerSocketId, { playerId: ownerId });
      const room = service.handleCreateRoom(ownerSocketId, {
        playerId: ownerId,
        options: { maxPlayers: 4, betAmount: 10, scoreLimit: 100 },
      });

      service.handleRegisterPlayer(playerSocketId, { playerId });
      service.handleJoinRoom(playerSocketId, {
        playerId,
        roomId: room.id,
      });

      const result = service.handleDisconnect(playerSocketId);

      expect(result).toEqual({
        message: 'Player disconnected',
        socketId: playerSocketId,
      });

      // Verify room still exists with both players (for reconnection)
      const roomAfterDisconnect = roomManager.getRoom(room.id);
      expect(roomAfterDisconnect).toBeDefined();
      expect(roomAfterDisconnect?.players).toEqual([ownerId, playerId]);
    });
  });

  describe('Reconnection Scenario', () => {
    it('should allow player to leave room after refresh (simulating the reported issue)', () => {
      const socketId1 = 'socket-1';
      const socketId2 = 'socket-2'; // New socket after refresh
      const playerId = 'player-123';

      // 1. Register player and create room
      service.handleRegisterPlayer(socketId1, { playerId });
      const room = service.handleCreateRoom(socketId1, {
        playerId,
        options: { maxPlayers: 4, betAmount: 10, scoreLimit: 100 },
      });

      // 2. Simulate disconnect (refresh)
      service.handleDisconnect(socketId1);

      // 3. Simulate reconnection with new socket
      const reconnectionResult = service.handleRegisterPlayer(socketId2, {
        playerId,
      });

      // 4. Verify player is reconnected to room
      expect(reconnectionResult.room).toBeDefined();
      expect(reconnectionResult.room?.id).toBe(room.id);
      expect(reconnectionResult.player.roomId).toBe(room.id);

      // 5. Try to leave room (should fail since owner can't leave)
      expect(() => {
        service.handleLeaveRoom(socketId2, {
          playerId,
          roomId: room.id,
        });
      }).toThrow(UnauthorizedRoomActionException);

      // 6. Try to delete room (this should work)
      const deleteResult = service.handleDeleteRoom(socketId2, {
        playerId,
        roomId: room.id,
      });

      // 7. Verify delete was successful
      expect(deleteResult).toEqual({ roomId: room.id });

      // 8. Verify room no longer exists
      const roomAfterDelete = roomManager.getRoom(room.id);
      expect(roomAfterDelete).toBeUndefined();

      // 9. Verify player is no longer in room
      const playerAfterDelete = roomManager.getPlayer(socketId2);
      expect(playerAfterDelete?.roomId).toBeNull();
    });
  });
});
