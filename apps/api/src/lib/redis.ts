import { createClient } from 'redis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redis = createClient({
  url: redisUrl
});

redis.on('error', (err) => console.log('Redis Client Error', err));

// Connect to Redis
(async () => {
  await redis.connect();
  console.log('Connected to Redis');
})();