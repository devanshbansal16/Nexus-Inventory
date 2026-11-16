/**
 * Socket.IO connection handler and real-time event broadcaster.
 */
let globalIO = null;

const socketHandler = (io, socket) => {
  globalIO = io;
  console.log(`[Socket.IO] Client connected: ${socket.id}`);

  // Join dashboard room
  socket.on('join:dashboard', () => {
    socket.join('dashboard');
  });

  // Join specific warehouse room
  socket.on('join:warehouse', (warehouseId) => {
    socket.join(`warehouse:${warehouseId}`);
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
  });
};

const getSocketIO = () => globalIO;

const emitInventoryUpdate = (data) => {
  if (globalIO) {
    globalIO.emit('inventory:updated', data);
  }
};

const emitOrderCreated = (order) => {
  if (globalIO) {
    globalIO.emit('order:created', order);
  }
};

const emitSyncEvent = (syncData) => {
  if (globalIO) {
    globalIO.emit('sync:completed', syncData);
  }
};

const emitNotification = (notification) => {
  if (globalIO) {
    globalIO.emit('notification:new', notification);
  }
};

module.exports = {
  socketHandler,
  getSocketIO,
  emitInventoryUpdate,
  emitOrderCreated,
  emitSyncEvent,
  emitNotification,
};
