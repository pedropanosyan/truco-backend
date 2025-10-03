import { Injectable, Inject } from '@nestjs/common';
import { Redis } from 'ioredis';
import { PlayerSession } from '../types';
import { keys, REDIS } from '../../redis';

@Injectable()
export class SessionService {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  async createOrAttach(playerId: string, socketId: string, graceMs = 60000): Promise<PlayerSession> {
    const now = Date.now();

    const h = await this.redis.hgetall(keys.player(playerId));

    const session: PlayerSession = {
      playerId,
      socketId,
      roomId: h.roomId || undefined,
      isConnected: true,
      lastSeen: now,
      reconnectUntil: now + graceMs,
    };

    await this.redis.hset(keys.player(playerId), {
      playerId,
      socketId,
      roomId: session.roomId || '',
      isConnected: 'true',
      lastSeen: String(now),
      reconnectUntil: String(session.reconnectUntil),
    });

    return session;
  }

  async markDisconnected(playerId: string, graceMs = 60000): Promise<void> {
    const now = Date.now();
    await this.redis.hset(keys.player(playerId), {
      isConnected: 'false',
      lastSeen: String(now),
      reconnectUntil: String(now + graceMs),
    });
  }

  async reconnect(playerId: string, newSocketId: string): Promise<PlayerSession | null> {
    const h = await this.redis.hgetall(keys.player(playerId));
    if (!h?.playerId) return null;

    const now = Date.now();
    const reconnectUntil = Number(h.reconnectUntil || 0);
    if (reconnectUntil && now > reconnectUntil) {
      await this.redis.hset(keys.player(playerId), {
        isConnected: 'false',
        lastSeen: String(now),
      });
      return null;
    }

    await this.redis.hset(keys.player(playerId), {
      socketId: newSocketId,
      isConnected: 'true',
      lastSeen: String(now),
    });

    return {
      playerId: h.playerId,
      socketId: newSocketId,
      roomId: h.roomId || undefined,
      isConnected: true,
      lastSeen: now,
      reconnectUntil,
    };
  }

  async get(playerId: string): Promise<PlayerSession | null> {
    const h = await this.redis.hgetall(keys.player(playerId));
    if (!h?.playerId) return null;

    return {
      playerId: h.playerId,
      socketId: h.socketId,
      roomId: h.roomId || undefined,
      isConnected: h.isConnected === 'true',
      lastSeen: Number(h.lastSeen || 0),
      reconnectUntil: h.reconnectUntil ? Number(h.reconnectUntil) : undefined,
    };
  }

  async setRoom(playerId: string, roomKeyOrEmpty: string): Promise<void> {
    await this.redis.hset(keys.player(playerId), {
      roomId: roomKeyOrEmpty,
    });
  }
}
