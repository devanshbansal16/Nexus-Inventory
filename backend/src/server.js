require('dotenv').config();

const http = require('http');
const app = require('./app');
const connectDB = require('./config/db');
const { initSocket } = require('./config/socket');
const { startOutboxWorker } = require('./workers/syncWorker');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  // Connect to MongoDB
  await connectDB();

  // Create HTTP server
  const server = http.createServer(app);

  // Initialize Socket.IO
  initSocket(server);

  // Start background Outbox Event Processor
  startOutboxWorker(4000);

  server.listen(PORT, () => {
    console.log(`[CIMS Backend] Server running on port ${PORT}`);
  });
};

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
