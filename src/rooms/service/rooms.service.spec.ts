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

      service.handleRegisterPlayer(socketId, data);

      const player = roomManager.getPlayer(socketId);
      expect(player).toEqual({
        socketId,
        playerId: 'player-123',
        roomId: null,
      });
    });

    it('should throw error if player already exists', () => {
      const socketId = 'test-socket';
      const data: RegisterPlayerDto = { playerId: 'player-123' };

      // Register player first time
      service.handleRegisterPlayer(socketId, data);

      // Try to register again
      expect(() => {
        service.handleRegisterPlayer(socketId, data);
      }).toThrow(PlayerAlreadyInRoomException);
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

    it('should throw error if player not found', () => {
      const data: JoinRoomDto = {
        playerId: 'player-123',
        roomId: 'test-room',
      };

      expect(() => {
        service.handleJoinRoom('test-socket', data);
      }).toThrow(PlayerNotFoundException);
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
        roomId: room.id,
        players: [ownerId],
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

      // Verify player is removed
      const player = roomManager.getPlayer(socketId);
      expect(player).toBeUndefined();
    });

    it('should remove player from room and delete room when owner disconnects', () => {
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

      // Verify room is deleted
      const roomAfterDisconnect = roomManager.getRoom(room.id);
      expect(roomAfterDisconnect).toBeUndefined();
    });

    it('should remove player from room but keep room when non-owner disconnects', () => {
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

      // Verify room still exists with only owner
      const roomAfterDisconnect = roomManager.getRoom(room.id);
      expect(roomAfterDisconnect).toBeDefined();
      expect(roomAfterDisconnect?.players).toEqual([ownerId]);
    });
  });
});
