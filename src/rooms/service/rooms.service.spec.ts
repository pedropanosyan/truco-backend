import { Test, TestingModule } from '@nestjs/testing';
import { RoomsService } from './rooms.service';
import {
  ConnectedResponse,
  DisconnectedResponse,
  CreateRoomDto,
  JoinRoomDto,
  LeaveRoomDto,
} from '../dto';
import {
  PlayerNotFoundException,
  PlayerAlreadyInRoomException,
  PlayerNotInRoomException,
  RoomNotFoundException,
  RoomFullException,
} from '../exceptions';

describe('RoomsService', () => {
  let service: RoomsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RoomsService],
    }).compile();

    service = module.get<RoomsService>(RoomsService);
  });

  const getRoomManager = () => (service as any).roomManager;

  const clearRoomManager = () => {
    const roomManager = getRoomManager();
    roomManager.rooms.clear();
    roomManager.sockets.clear();
  };

  const createMockPlayer = (
    socketId: string,
    playerId: string,
    roomId: string | null = null,
  ) => ({
    socketId,
    playerId,
    roomId,
  });

  const createMockRoom = (overrides: Partial<any> = {}) => ({
    id: 'test-room',
    owner: 'owner-123',
    players: ['owner-123'],
    maxPlayers: 4,
    betAmount: 10,
    ...overrides,
  });

  const createCreateRoomDto = (
    overrides: Partial<CreateRoomDto> = {},
  ): CreateRoomDto => ({
    playerId: 'player-123',
    options: {
      maxPlayers: 4,
      betAmount: 10,
    },
    ...overrides,
  });

  const createJoinRoomDto = (
    overrides: Partial<JoinRoomDto> = {},
  ): JoinRoomDto => ({
    playerId: 'player-123',
    roomId: 'test-room',
    ...overrides,
  });

  const createLeaveRoomDto = (
    overrides: Partial<LeaveRoomDto> = {},
  ): LeaveRoomDto => ({
    roomId: 'test-room',
    playerId: 'player-123',
    ...overrides,
  });

  const setupPlayerInRoom = (
    socketId: string,
    playerId: string,
    roomId: string,
  ) => {
    const roomManager = getRoomManager();
    roomManager.sockets.set(
      socketId,
      createMockPlayer(socketId, playerId, roomId),
    );
  };

  const setupRoom = (room: any) => {
    const roomManager = getRoomManager();
    roomManager.rooms.set(room.id, room);
  };

  const expectDisconnectedResponse = (
    result: DisconnectedResponse,
    socketId: string,
  ) => {
    expect(result).toEqual({
      message: 'Player disconnected',
      socketId,
    });
  };

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleConnection', () => {
    it('should return a connected response with the provided socket ID', () => {
      const socketId = 'test-socket-123';

      const result: ConnectedResponse = service.handleConnection(socketId);

      expect(result).toEqual({
        message: 'Player connected',
        socketId: socketId,
        rooms: [],
      });
    });
  });

  describe('handleDisconnect', () => {
    beforeEach(clearRoomManager);

    it('should gracefully handle disconnect when socket ID is not found', () => {
      const socketId = 'non-existent-socket';
      const result = service.handleDisconnect(socketId);
      expectDisconnectedResponse(result, socketId);
    });

    it('should gracefully handle disconnect when player has no room', () => {
      const socketId = 'test-socket';
      const playerId = 'player-123';
      const roomManager = getRoomManager();

      roomManager.sockets.set(socketId, createMockPlayer(socketId, playerId));

      const result = service.handleDisconnect(socketId);

      expectDisconnectedResponse(result, socketId);
      expect(roomManager.sockets.has(socketId)).toBe(false);
    });

    it('should gracefully handle disconnect when room no longer exists', () => {
      const socketId = 'test-socket';
      const playerId = 'player-123';
      const roomId = 'non-existent-room';
      const roomManager = getRoomManager();

      roomManager.sockets.set(
        socketId,
        createMockPlayer(socketId, playerId, roomId),
      );

      const result = service.handleDisconnect(socketId);

      expectDisconnectedResponse(result, socketId);
      expect(roomManager.sockets.has(socketId)).toBe(false);
    });

    it('should successfully disconnect player and remove room when player is owner', () => {
      const socketId = 'test-socket';
      const playerId = 'player-123';
      const roomId = 'test-room';
      const roomManager = getRoomManager();

      setupPlayerInRoom(socketId, playerId, roomId);
      setupRoom(
        createMockRoom({
          id: roomId,
          owner: playerId,
          players: [playerId],
        }),
      );

      const result = service.handleDisconnect(socketId);

      expectDisconnectedResponse(result, socketId);
      expect(roomManager.rooms.has(roomId)).toBe(false);
      expect(roomManager.sockets.has(socketId)).toBe(false);
    });

    it('should successfully disconnect player and remove from room when player is not owner', () => {
      const socketId = 'test-socket';
      const playerId = 'player-123';
      const ownerId = 'owner-456';
      const roomId = 'test-room';
      const roomManager = getRoomManager();

      setupPlayerInRoom(socketId, playerId, roomId);
      setupRoom(
        createMockRoom({
          id: roomId,
          owner: ownerId,
          players: [ownerId, playerId],
        }),
      );

      const result = service.handleDisconnect(socketId);

      expectDisconnectedResponse(result, socketId);
      expect(roomManager.rooms.has(roomId)).toBe(true);

      const room = roomManager.rooms.get(roomId);
      expect(room.players).toEqual([ownerId]);
      expect(room.players).not.toContain(playerId);
      expect(roomManager.sockets.has(socketId)).toBe(false);
    });
  });

  describe('handleCreateRoom', () => {
    beforeEach(clearRoomManager);

    const testCases = [
      {
        description:
          'should throw PlayerNotFoundException when player does not exist',
        setup: () => ({}),
        socketId: 'non-existent-socket',
        data: createCreateRoomDto(),
        expectedError: PlayerNotFoundException,
      },
      {
        description:
          'should throw PlayerNotFoundException when player ID does not match',
        setup: () => {
          const roomManager = getRoomManager();
          roomManager.sockets.set(
            'test-socket',
            createMockPlayer('test-socket', 'player-123'),
          );
          return {};
        },
        socketId: 'test-socket',
        data: createCreateRoomDto({ playerId: 'different-player-456' }),
        expectedError: PlayerNotFoundException,
      },
      {
        description:
          'should throw PlayerAlreadyInRoomException when player is already in a room',
        setup: () => {
          const roomManager = getRoomManager();
          roomManager.sockets.set(
            'test-socket',
            createMockPlayer('test-socket', 'player-123', 'existing-room'),
          );
          return {};
        },
        socketId: 'test-socket',
        data: createCreateRoomDto(),
        expectedError: PlayerAlreadyInRoomException,
      },
    ];

    testCases.forEach(
      ({ description, setup, socketId, data, expectedError }) => {
        it(description, () => {
          setup();
          expect(() => service.handleCreateRoom(socketId, data)).toThrow(
            expectedError,
          );
        });
      },
    );

    it('should successfully create a room when all conditions are met', () => {
      const socketId = 'test-socket';
      const playerId = 'player-123';
      const roomManager = getRoomManager();

      roomManager.sockets.set(socketId, createMockPlayer(socketId, playerId));

      const createRoomData = createCreateRoomDto({
        playerId,
        options: { maxPlayers: 6, betAmount: 25 },
      });

      const result = service.handleCreateRoom(socketId, createRoomData);

      expect(result).toMatchObject({
        owner: playerId,
        players: [playerId],
        maxPlayers: 6,
        betAmount: 25,
      });
      expect(result.id).toBeDefined();
      expect(roomManager.rooms.has(result.id)).toBe(true);

      const room = roomManager.rooms.get(result.id);
      expect(room).toEqual(result);

      const updatedPlayer = roomManager.sockets.get(socketId);
      expect(updatedPlayer.roomId).toBe(result.id);
    });
  });

  describe('handleJoinRoom', () => {
    beforeEach(clearRoomManager);

    const joinRoomTestCases = [
      {
        description:
          'should throw PlayerNotFoundException when player does not exist',
        setup: () => ({}),
        socketId: 'non-existent-socket',
        data: createJoinRoomDto(),
        expectedError: PlayerNotFoundException,
      },
      {
        description:
          'should throw PlayerNotFoundException when player ID does not match',
        setup: () => {
          const roomManager = getRoomManager();
          roomManager.sockets.set(
            'test-socket',
            createMockPlayer('test-socket', 'player-123'),
          );
          return {};
        },
        socketId: 'test-socket',
        data: createJoinRoomDto({ playerId: 'different-player-456' }),
        expectedError: PlayerNotFoundException,
      },
      {
        description:
          'should throw PlayerAlreadyInRoomException when player is already in a room',
        setup: () => {
          const roomManager = getRoomManager();
          roomManager.sockets.set(
            'test-socket',
            createMockPlayer('test-socket', 'player-123', 'existing-room'),
          );
          return {};
        },
        socketId: 'test-socket',
        data: createJoinRoomDto({ roomId: 'different-room' }),
        expectedError: PlayerAlreadyInRoomException,
      },
      {
        description:
          'should throw RoomNotFoundException when room does not exist',
        setup: () => {
          const roomManager = getRoomManager();
          roomManager.sockets.set(
            'test-socket',
            createMockPlayer('test-socket', 'player-123'),
          );
          return {};
        },
        socketId: 'test-socket',
        data: createJoinRoomDto({ roomId: 'non-existent-room' }),
        expectedError: RoomNotFoundException,
      },
      {
        description: 'should throw RoomFullException when room is full',
        setup: () => {
          const roomManager = getRoomManager();
          roomManager.sockets.set(
            'test-socket',
            createMockPlayer('test-socket', 'player-123'),
          );
          setupRoom(
            createMockRoom({
              players: ['owner-456', 'other-player'],
              maxPlayers: 2,
            }),
          );
          return {};
        },
        socketId: 'test-socket',
        data: createJoinRoomDto(),
        expectedError: RoomFullException,
      },
    ];

    joinRoomTestCases.forEach(
      ({ description, setup, socketId, data, expectedError }) => {
        it(description, () => {
          setup();
          expect(() => service.handleJoinRoom(socketId, data)).toThrow(
            expectedError,
          );
        });
      },
    );

    it('should successfully join a room when all conditions are met', () => {
      const socketId = 'test-socket';
      const playerId = 'player-123';
      const ownerId = 'owner-456';
      const roomId = 'test-room';
      const roomManager = getRoomManager();

      roomManager.sockets.set(socketId, createMockPlayer(socketId, playerId));
      setupRoom(
        createMockRoom({
          id: roomId,
          owner: ownerId,
          players: [ownerId],
        }),
      );

      const result = service.handleJoinRoom(
        socketId,
        createJoinRoomDto({
          playerId,
          roomId,
        }),
      );

      expect(result).toEqual({
        roomId,
        players: [ownerId, playerId],
      });

      const updatedPlayer = roomManager.sockets.get(socketId);
      expect(updatedPlayer.roomId).toBe(roomId);

      const updatedRoom = roomManager.rooms.get(roomId);
      expect(updatedRoom.players).toEqual([ownerId, playerId]);
    });
  });

  describe('handleLeaveRoom', () => {
    beforeEach(clearRoomManager);

    const leaveRoomTestCases = [
      {
        description:
          'should throw PlayerNotFoundException when player does not exist',
        setup: () => ({}),
        socketId: 'non-existent-socket',
        data: createLeaveRoomDto(),
        expectedError: PlayerNotFoundException,
      },
      {
        description:
          'should throw PlayerNotFoundException when player ID does not match',
        setup: () => {
          const roomManager = getRoomManager();
          roomManager.sockets.set(
            'test-socket',
            createMockPlayer('test-socket', 'player-123', 'some-room'),
          );
          return {};
        },
        socketId: 'test-socket',
        data: createLeaveRoomDto({ playerId: 'different-player-456' }),
        expectedError: PlayerNotFoundException,
      },
      {
        description:
          'should throw PlayerNotInRoomException when player is not in a room',
        setup: () => {
          const roomManager = getRoomManager();
          roomManager.sockets.set(
            'test-socket',
            createMockPlayer('test-socket', 'player-123'),
          );
          return {};
        },
        socketId: 'test-socket',
        data: createLeaveRoomDto(),
        expectedError: PlayerNotInRoomException,
      },
      {
        description:
          'should throw RoomNotFoundException when room does not exist',
        setup: () => {
          const roomManager = getRoomManager();
          roomManager.sockets.set(
            'test-socket',
            createMockPlayer('test-socket', 'player-123', 'non-existent-room'),
          );
          return {};
        },
        socketId: 'test-socket',
        data: createLeaveRoomDto(),
        expectedError: RoomNotFoundException,
      },
    ];

    leaveRoomTestCases.forEach(
      ({ description, setup, socketId, data, expectedError }) => {
        it(description, () => {
          setup();
          expect(() => service.handleLeaveRoom(socketId, data)).toThrow(
            expectedError,
          );
        });
      },
    );

    it('should delete room and return DeleteRoomResponse when player is the room owner', () => {
      const socketId = 'test-socket';
      const playerId = 'player-123';
      const roomId = 'test-room';
      const roomManager = getRoomManager();

      setupPlayerInRoom(socketId, playerId, roomId);
      setupRoom(
        createMockRoom({
          id: roomId,
          owner: playerId,
          players: [playerId],
        }),
      );

      const result = service.handleLeaveRoom(
        socketId,
        createLeaveRoomDto({
          roomId,
          playerId,
        }),
      );

      expect(result).toEqual({ roomId });
      expect(roomManager.rooms.has(roomId)).toBe(false);
    });

    it('should remove player from room and return LeaveRoomResponse when player is not the owner', () => {
      const socketId = 'test-socket';
      const playerId = 'player-123';
      const ownerId = 'owner-456';
      const otherPlayerId = 'other-789';
      const roomId = 'test-room';
      const roomManager = getRoomManager();

      setupPlayerInRoom(socketId, playerId, roomId);
      setupRoom(
        createMockRoom({
          id: roomId,
          owner: ownerId,
          players: [ownerId, playerId, otherPlayerId],
        }),
      );

      const result = service.handleLeaveRoom(
        socketId,
        createLeaveRoomDto({
          roomId,
          playerId,
        }),
      );

      expect(result).toEqual({
        roomId,
        players: [ownerId, otherPlayerId],
      });

      expect(roomManager.rooms.has(roomId)).toBe(true);

      const updatedRoom = roomManager.rooms.get(roomId);
      expect(updatedRoom.players).toEqual([ownerId, otherPlayerId]);
      expect(updatedRoom.players).not.toContain(playerId);
    });

    it('should handle leaving room with only owner and one other player', () => {
      const socketId = 'test-socket';
      const playerId = 'player-123';
      const ownerId = 'owner-456';
      const roomId = 'test-room';
      const roomManager = getRoomManager();

      setupPlayerInRoom(socketId, playerId, roomId);
      setupRoom(
        createMockRoom({
          id: roomId,
          owner: ownerId,
          players: [ownerId, playerId],
        }),
      );

      const result = service.handleLeaveRoom(
        socketId,
        createLeaveRoomDto({
          roomId,
          playerId,
        }),
      );

      expect(result).toEqual({
        roomId,
        players: [ownerId],
      });

      expect(roomManager.rooms.has(roomId)).toBe(true);

      const updatedRoom = roomManager.rooms.get(roomId);
      expect(updatedRoom.players).toEqual([ownerId]);
    });
  });
});
