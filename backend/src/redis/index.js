const Redis = require('ioredis');
require('dotenv').config();

const redis = new Redis(process.env.REDIS_URL, {
  tls: { rejectUnauthorized: false }
});

redis.on('connect', () => {
  console.log('Connected to Upstash Redis successfully!');
});

redis.on('error', (err) => {
  console.error('Redis connection error:', err);
});

module.exports = redis;
