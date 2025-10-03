import { Test, TestingModule } from '@nestjs/testing';
import { LobbyGateway } from './lobby.gateway';
import { LobbyService } from '../service';
import { ServerToClientEvents } from '../types';
import { CreateRoomDto, JoinRoomDto, LeaveRoomDto, RegisterPlayerDto } from '../dto';
import type { Socket, Server } from 'socket.io';
import { RoomManager } from '../utils';
import { GameService } from 'src/game';

const createMockSocket = (id: string): Partial<Socket> => ({
  id,
  emit: jest.fn(),
  join: jest.fn(),
  leave: jest.fn(),
});

const createMockServer = (): Partial<Server> => ({
  emit: jest.fn(),
  to: jest.fn().mockReturnThis(),
});

describe('LobbyGateway', () => {
  let gateway: LobbyGateway;
  let service: LobbyService;
  let mockSocket: Partial<Socket>;
  let mockServer: Partial<Server>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LobbyGateway,
        LobbyService,
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

    gateway = module.get<LobbyGateway>(LobbyGateway);
    service = module.get<LobbyService>(LobbyService);
    mockSocket = createMockSocket('test-socket-123');
    mockServer = createMockServer();
    gateway.server = mockServer as Server;

    // Clear service state before each test
    const roomManager = (service as any).roomManager;
    roomManager.rooms.clear();
    roomManager.players.clear();
    roomManager.socketToPlayer.clear();
  });

  describe('handleConnection', () => {
    it('should emit connected event with connection response', () => {
      gateway.handleConnection(mockSocket as Socket);

      expect(mockSocket.emit).toHaveBeenCalledWith(
        ServerToClientEvents.CONNECTED,
        [],
      );
    });
  });

  describe('handleRegisterPlayer', () => {
    it('should register new player and emit connected event', () => {
      const data: RegisterPlayerDto = { playerId: 'player-123' };

      gateway.handleRegisterPlayer(mockSocket as Socket, data);

      expect(mockSocket.emit).toHaveBeenCalledWith(
        ServerToClientEvents.ROOMS,
        [],
      );
    });

    it('should reconnect player to existing room', () => {
      const roomManager = (service as any).roomManager;
      const roomId = 'test-room';

      // Setup existing player in room
      roomManager.rooms.set(roomId, {
        id: roomId,
        owner: 'player-123',
        players: ['player-123'],
        maxPlayers: 4,
        betAmount: 10,
        scoreLimit: 100,
      });

      const player = {
        socketId: 'old-socket',
        playerId: 'player-123',
        roomId: roomId,
      };
      roomManager.players.set('player-123', player);
      roomManager.socketToPlayer.set('old-socket', 'player-123');

      const data: RegisterPlayerDto = { playerId: 'player-123' };

      gateway.handleRegisterPlayer(mockSocket as Socket, data);

      // Should emit room updated event
      expect(mockServer.emit).toHaveBeenCalledWith(
        ServerToClientEvents.ROOM_UPDATED,
        expect.objectContaining({
          id: roomId,
          owner: 'player-123',
          players: ['player-123'],
        }),
      );

      // Should emit connected event with rooms
      expect(mockSocket.emit).toHaveBeenCalledWith(
        ServerToClientEvents.ROOMS,
        expect.arrayContaining([
          expect.objectContaining({
            id: roomId,
            owner: 'player-123',
            players: ['player-123'],
          }),
        ]),
      );
    });
  });

  describe('handleDisconnect', () => {
    it('should emit disconnected event with disconnect response', () => {
      gateway.handleDisconnect(mockSocket as Socket);

      expect(mockSocket.emit).toHaveBeenCalledWith(
        ServerToClientEvents.DISCONNECTED,
        {
          message: 'Player disconnected',
          socketId: 'test-socket-123',
        },
      );
    });
  });

  describe('handleCreateRoom', () => {
    it('should create room and emit room created event to all clients', () => {
      const createRoomDto: CreateRoomDto = {
        playerId: 'player-123',
        options: {
          maxPlayers: 4,
          betAmount: 10,
          scoreLimit: 100,
        },
      };

      const roomManager = (service as any).roomManager;
      const player = {
        socketId: 'test-socket-123',
        playerId: 'player-123',
        roomId: null,
      };
      roomManager.players.set('player-123', player);
      roomManager.socketToPlayer.set('test-socket-123', 'player-123');

      gateway.handleCreateRoom(mockSocket as Socket, createRoomDto);

      expect(mockServer.emit).toHaveBeenCalledWith(
        ServerToClientEvents.ROOM_CREATED,
        expect.objectContaining({
          owner: 'player-123',
          players: ['player-123'],
          maxPlayers: 4,
          betAmount: 10,
          scoreLimit: 100,
        }),
      );
    });
  });

  describe('handleJoinRoom', () => {
    it('should join room and emit room updated event to all clients', () => {
      const roomManager = (service as any).roomManager;

      const roomId = 'test-room';
      roomManager.rooms.set(roomId, {
        id: roomId,
        owner: 'owner-123',
        players: ['owner-123'],
        maxPlayers: 4,
        betAmount: 10,
        scoreLimit: 100,
      });

      const player = {
        socketId: 'test-socket-123',
        playerId: 'player-123',
        roomId: null,
      };
      roomManager.players.set('player-123', player);
      roomManager.socketToPlayer.set('test-socket-123', 'player-123');

      const joinRoomDto: JoinRoomDto = {
        playerId: 'player-123',
        roomId: roomId,
      };

      gateway.handleJoinRoom(mockSocket as Socket, joinRoomDto);

      expect(mockServer.emit).toHaveBeenCalledWith(
        ServerToClientEvents.ROOM_UPDATED,
        expect.objectContaining({
          id: roomId,
          players: ['owner-123', 'player-123'],
          owner: 'owner-123',
          maxPlayers: 4,
          betAmount: 10,
          scoreLimit: 100,
        }),
      );
    });
  });

  describe('handleLeaveRoom', () => {
    it('should leave room and emit room updated event when player is not owner', () => {
      const roomManager = (service as any).roomManager;
      const roomId = 'test-room';

      roomManager.rooms.set(roomId, {
        id: roomId,
        owner: 'owner-123',
        players: ['owner-123', 'player-123'],
        maxPlayers: 4,
        betAmount: 10,
        scoreLimit: 100,
      });

      const player = {
        socketId: 'test-socket-123',
        playerId: 'player-123',
        roomId: roomId,
      };
      roomManager.players.set('player-123', player);
      roomManager.socketToPlayer.set('test-socket-123', 'player-123');

      const leaveRoomDto: LeaveRoomDto = {
        roomId: roomId,
        playerId: 'player-123',
      };

      gateway.handleLeaveRoom(mockSocket as Socket, leaveRoomDto);

      expect(mockServer.emit).toHaveBeenCalledWith(
        ServerToClientEvents.ROOM_UPDATED,
        expect.objectContaining({
          id: roomId,
          players: ['owner-123'],
          owner: 'owner-123',
          maxPlayers: 4,
          betAmount: 10,
          scoreLimit: 100,
        }),
      );
    });

    it('should throw error when owner tries to leave room', () => {
      const roomManager = (service as any).roomManager;
      const roomId = 'test-room';

      roomManager.rooms.set(roomId, {
        id: roomId,
        owner: 'player-123',
        players: ['player-123'],
        maxPlayers: 4,
        betAmount: 10,
        scoreLimit: 100,
      });

      const player = {
        socketId: 'test-socket-123',
        playerId: 'player-123',
        roomId: roomId,
      };
      roomManager.players.set('player-123', player);
      roomManager.socketToPlayer.set('test-socket-123', 'player-123');

      const leaveRoomDto: LeaveRoomDto = {
        roomId: roomId,
        playerId: 'player-123',
      };

      gateway.handleLeaveRoom(mockSocket as Socket, leaveRoomDto);

      expect(mockSocket.emit).toHaveBeenCalledWith(
        ServerToClientEvents.ERROR,
        expect.objectContaining({
          message: expect.stringContaining(
            'leave room (owners must delete room instead)',
          ),
          type: 'UnauthorizedRoomActionException',
          socketId: 'test-socket-123',
        }),
      );
    });
  });

  describe('handleDeleteRoom', () => {
    it('should delete room and emit room deleted event when owner requests it', () => {
      const roomManager = (service as any).roomManager;
      const roomId = 'test-room';

      roomManager.rooms.set(roomId, {
        id: roomId,
        owner: 'player-123',
        players: ['player-123'],
        maxPlayers: 4,
        betAmount: 10,
        scoreLimit: 100,
      });

      const player = {
        socketId: 'test-socket-123',
        playerId: 'player-123',
        roomId: roomId,
      };
      roomManager.players.set('player-123', player);
      roomManager.socketToPlayer.set('test-socket-123', 'player-123');

      const deleteRoomDto: LeaveRoomDto = {
        roomId: roomId,
        playerId: 'player-123',
      };

      gateway.handleDeleteRoom(mockSocket as Socket, deleteRoomDto);

      expect(mockServer.emit).toHaveBeenCalledWith(
        ServerToClientEvents.ROOM_DELETED,
        roomId,
      );
    });

    it('should throw error when non-owner tries to delete room', () => {
      const roomManager = (service as any).roomManager;
      const roomId = 'test-room';

      roomManager.rooms.set(roomId, {
        id: roomId,
        owner: 'owner-123',
        players: ['owner-123', 'player-123'],
        maxPlayers: 4,
        betAmount: 10,
        scoreLimit: 100,
      });

      const player = {
        socketId: 'test-socket-123',
        playerId: 'player-123',
        roomId: roomId,
      };
      roomManager.players.set('player-123', player);
      roomManager.socketToPlayer.set('test-socket-123', 'player-123');

      const deleteRoomDto: LeaveRoomDto = {
        roomId: roomId,
        playerId: 'player-123',
      };

      gateway.handleDeleteRoom(mockSocket as Socket, deleteRoomDto);

      expect(mockSocket.emit).toHaveBeenCalledWith(
        ServerToClientEvents.ERROR,
        expect.objectContaining({
          message: expect.stringContaining(
            'delete room (only room owners can delete rooms)',
          ),
          type: 'UnauthorizedRoomActionException',
          socketId: 'test-socket-123',
        }),
      );
    });
  });
});
