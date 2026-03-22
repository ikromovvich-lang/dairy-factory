const Redis = require('ioredis');
const logger = require('../utils/logger');

let redis = null;

function createMemoryCache() {
  const store = new Map();
  return {
    get: async (k) => store.get(k) || null,
    set: async (k, v) => { store.set(k, v); return 'OK'; },
    del: async (k) => store.delete(k),
    expire: async () => true,
    ping: async () => 'PONG',
  };
}

async function initRedis() {
  try {
    redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      retryStrategy: (times) => Math.min(times * 50, 2000),
      maxRetriesPerRequest: 3,
    });
    redis.on('connect', () => logger.info('Redis connected'));
    redis.on('error', (err) => logger.error('Redis error:', err.message));
    await redis.ping();
    return redis;
  } catch (err) {
    logger.warn('Redis not available, using in-memory fallback');
    redis = createMemoryCache();
    return redis;
  }
}

function getRedis() { return redis; }
module.exports = { initRedis, getRedis };
