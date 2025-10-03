import { SessionService } from './session.service';
import { keys } from '../../redis';

type MockRedis = {
  hgetall: jest.Mock;
  hset: jest.Mock;
};

describe('SessionService', () => {
  let service: SessionService;
  let redis: MockRedis;
  const playerId = 'p1';
  const socketId = 's1';

  const fixedNow = 1_700_000_000_000;
  const originalNow = Date.now;

  beforeAll(() => {
    Date.now = jest.fn(() => fixedNow);
  });

  afterAll(() => {
    // restore
    Date.now = originalNow;
  });

  beforeEach(() => {
    redis = {
      hgetall: jest.fn(),
      hset: jest.fn(),
    };
    service = new SessionService(redis as any);
  });

  describe('createOrAttach', () => {
    it('creates new session when no existing data', async () => {
      redis.hgetall.mockResolvedValue({});

      const session = await service.createOrAttach(playerId, socketId);

      expect(session).toEqual({
        playerId,
        socketId,
        roomId: undefined,
        isConnected: true,
        lastSeen: fixedNow,
        reconnectUntil: fixedNow + 60000,
      });

      expect(redis.hset).toHaveBeenCalledWith(keys.player(playerId), {
        playerId,
        socketId,
        roomId: '',
        isConnected: 'true',
        lastSeen: String(fixedNow),
        reconnectUntil: String(fixedNow + 60000),
      });
    });

    it('includes existing roomId from Redis hash', async () => {
      redis.hgetall.mockResolvedValue({ roomId: 'room:123' });

      const session = await service.createOrAttach(playerId, socketId);

      expect(session.roomId).toBe('room:123');
      expect(redis.hset).toHaveBeenCalledWith(
        keys.player(playerId),
        expect.objectContaining({
          roomId: 'room:123',
        }),
      );
    });

    it('respects custom graceMs when calculating reconnectUntil', async () => {
      redis.hgetall.mockResolvedValue({});

      const session = await service.createOrAttach(playerId, socketId, 5_000);

      expect(session.reconnectUntil).toBe(fixedNow + 5000);
      expect(redis.hset).toHaveBeenCalledWith(
        keys.player(playerId),
        expect.objectContaining({
          reconnectUntil: String(fixedNow + 5000),
        }),
      );
    });
  });

  describe('markDisconnected', () => {
    it('sets isConnected=false and updates lastSeen and reconnectUntil', async () => {
      await service.markDisconnected(playerId);

      expect(redis.hset).toHaveBeenCalledWith(keys.player(playerId), {
        isConnected: 'false',
        lastSeen: String(fixedNow),
        reconnectUntil: String(fixedNow + 60000),
      });
    });

    it('respects custom graceMs', async () => {
      await service.markDisconnected(playerId, 90_000);

      expect(redis.hset).toHaveBeenLastCalledWith(
        keys.player(playerId),
        expect.objectContaining({
          reconnectUntil: String(fixedNow + 90000),
        }),
      );
    });
  });

  describe('reconnect', () => {
    it('returns session and updates redis when within grace period', async () => {
      redis.hgetall.mockResolvedValue({
        playerId,
        socketId: 'old-socket',
        roomId: 'room:abc',
        isConnected: 'false',
        lastSeen: String(fixedNow - 1000),
        reconnectUntil: String(fixedNow + 1000),
      });

      const result = await service.reconnect(playerId, 'new-socket');

      expect(result).toEqual({
        playerId,
        socketId: 'new-socket',
        roomId: 'room:abc',
        isConnected: true,
        lastSeen: fixedNow,
        reconnectUntil: fixedNow + 1000,
      });

      expect(redis.hset).toHaveBeenCalledWith(
        keys.player(playerId),
        expect.objectContaining({
          socketId: 'new-socket',
          isConnected: 'true',
          lastSeen: String(fixedNow),
        }),
      );
    });

    it('returns null and marks as disconnected when grace expired', async () => {
      redis.hgetall.mockResolvedValue({
        playerId,
        reconnectUntil: String(fixedNow - 1),
      });

      const result = await service.reconnect(playerId, 'new-socket');

      expect(result).toBeNull();
      expect(redis.hset).toHaveBeenCalledWith(
        keys.player(playerId),
        expect.objectContaining({
          isConnected: 'false',
          lastSeen: String(fixedNow),
        }),
      );
    });

    it('returns null when player is missing', async () => {
      redis.hgetall.mockResolvedValue({});

      const result = await service.reconnect(playerId, 'new-socket');
      expect(result).toBeNull();
      expect(redis.hset).not.toHaveBeenCalled();
    });
  });

  describe('get', () => {
    it('maps redis hash into PlayerSession with proper types', async () => {
      redis.hgetall.mockResolvedValue({
        playerId,
        socketId,
        roomId: 'room:xyz',
        isConnected: 'true',
        lastSeen: String(fixedNow - 500),
        reconnectUntil: String(fixedNow + 2500),
      });

      const s = await service.get(playerId);
      expect(s).toEqual({
        playerId,
        socketId,
        roomId: 'room:xyz',
        isConnected: true,
        lastSeen: fixedNow - 500,
        reconnectUntil: fixedNow + 2500,
      });
    });

    it('returns null when player not found', async () => {
      redis.hgetall.mockResolvedValue({});
      const s = await service.get(playerId);
      expect(s).toBeNull();
    });

    it('sets roomId undefined when empty string', async () => {
      redis.hgetall.mockResolvedValue({
        playerId,
        socketId,
        roomId: '',
        isConnected: 'true',
        lastSeen: String(fixedNow),
      });

      const s = await service.get(playerId);
      expect(s?.roomId).toBeUndefined();
    });
  });

  describe('setRoom', () => {
    it('updates roomId in redis', async () => {
      await service.setRoom(playerId, 'room:777');
      expect(redis.hset).toHaveBeenCalledWith(keys.player(playerId), {
        roomId: 'room:777',
      });
    });

    it('clears roomId when empty string provided', async () => {
      await service.setRoom(playerId, '');
      expect(redis.hset).toHaveBeenCalledWith(keys.player(playerId), {
        roomId: '',
      });
    });
  });
});
