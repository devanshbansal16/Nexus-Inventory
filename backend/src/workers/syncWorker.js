const syncService = require('../services/sync.service');

let outboxInterval = null;

const startOutboxWorker = (intervalMs = 3000) => {
  if (outboxInterval) return;

  console.log(`[Outbox Worker] Transactional outbox background processor started (polling every ${intervalMs}ms)`);

  outboxInterval = setInterval(async () => {
    try {
      await syncService.processOutboxEvents(10);
    } catch (err) {
      console.error('[Outbox Worker] Error processing pending events:', err.message);
    }
  }, intervalMs);
};

const stopOutboxWorker = () => {
  if (outboxInterval) {
    clearInterval(outboxInterval);
    outboxInterval = null;
    console.log('[Outbox Worker] Stopped');
  }
};

module.exports = {
  startOutboxWorker,
  stopOutboxWorker,
};
