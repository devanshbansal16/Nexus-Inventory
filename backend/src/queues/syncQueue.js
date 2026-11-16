const { Queue } = require('bullmq');
const redis = require('../config/redis');

const syncQueue = new Queue('marketplace-sync', {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
});

module.exports = syncQueue;
