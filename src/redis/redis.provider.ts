import { Provider } from '@nestjs/common';
import { Redis } from 'ioredis';

export const REDIS = Symbol('REDIS');

export const RedisProvider: Provider = {
  provide: REDIS,
  useFactory: async () => {
    const url = process.env.REDIS_URL || 'redis://localhost:6379';
    const client = new Redis(url, {
      lazyConnect: true,
      maxRetriesPerRequest: null,
    });
    await client.connect();
    return client;
  },
};
