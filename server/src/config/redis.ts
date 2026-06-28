import Redis from 'ioredis';
import { config } from './index';

let redis: Redis;

try {
  redis = new Redis(config.redis.url, {
    maxRetriesPerRequest: 1,
    connectTimeout: 3000,
    retryStrategy(times) {
      if (times > 2) return null; // stop retrying after 2 attempts
      return Math.min(times * 100, 1000);
    },
    lazyConnect: true,
  });

  redis.on('connect', () => {
    console.log('✅ Redis connected');
  });

  redis.on('error', (err) => {
    console.error('❌ Redis connection error:', err.message);
  });
} catch (error) {
  console.error('❌ Failed to create Redis instance:', error);
  // Create a mock redis for development without Redis
  redis = new Redis({ lazyConnect: true });
}

export { redis };
export default redis;
