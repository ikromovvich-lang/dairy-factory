const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const logger = require('./logger');

let io = null;

function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Auth middleware for socket
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
      if (!token) return next(new Error('Authentication error'));
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
      socket.user = decoded;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const { userId, factoryId, role } = socket.user;
    logger.info(`Socket connected: user ${userId}, factory ${factoryId}`);

    // Join factory room
    socket.join(`factory:${factoryId}`);
    socket.join(`user:${userId}`);

    socket.on('join_room', (room) => {
      socket.join(room);
    });

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: user ${userId}`);
    });
  });

  return io;
}

// Send notification to all users in a factory
function emitToFactory(factoryId, event, data) {
  if (io) {
    io.to(`factory:${factoryId}`).emit(event, data);
  }
}

// Send to specific user
function emitToUser(userId, event, data) {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
}

// Broadcast system alert
function emitAlert(factoryId, notification) {
  emitToFactory(factoryId, 'notification', notification);
  emitToFactory(factoryId, 'alert', {
    type: notification.type,
    severity: notification.severity,
    title: notification.title,
    message: notification.message,
    timestamp: new Date().toISOString(),
  });
}

function getIO() { return io; }

module.exports = { initSocket, emitToFactory, emitToUser, emitAlert, getIO };
