const Redis = require('ioredis');

let isConnected = false;

const redisOptions = {
  maxRetriesPerRequest: null,
  enableOfflineQueue: false,
  lazyConnect: true,
  retryStrategy: (times) => {
    if (times > 3) {
      console.warn('[Redis] Connection unavailable. Async queue will use immediate outbox worker mode.');
      return null;
    }
    return Math.min(times * 500, 2000);
  },
};

const redis = process.env.REDIS_URL
  ? new Redis(process.env.REDIS_URL, redisOptions)
  : new Redis({
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: process.env.REDIS_PORT || 6379,
      ...redisOptions,
    });

redis.connect().then(() => {
  isConnected = true;
  console.log('[Redis] Connected successfully');
}).catch((err) => {
  console.warn(`[Redis] Notice: Redis not running locally (${err.message}). Outbox queue will process jobs directly.`);
});

redis.on('error', (err) => {
  // Silent unhandled error to prevent process crash
});

module.exports = redis;
