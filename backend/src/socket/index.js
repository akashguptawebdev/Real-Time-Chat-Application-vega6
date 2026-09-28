import { verifyAccessToken } from '../config/jwt.js';

// In-memory set of online user IDs
const onlineUsers = new Map(); // userId -> Set of socket IDs

export const initSocket = (io) => {
  // Authentication middleware for Socket.io
  io.use((socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = verifyAccessToken(token);
      socket.user = decoded;
      next();
    } catch (err) {
      return next(new Error('Authentication error: Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user.userId;

    // Track online user
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId).add(socket.id);

    // Join personal room for notifications & conversation list updates
    socket.join(`user_${userId}`);

    // Broadcast that this user is online
    io.emit('user:status', { userId, status: 'online' });

    // Send current list of online users to the freshly connected socket
    socket.emit('users:online_list', Array.from(onlineUsers.keys()));

    // Join conversation room
    socket.on('join_conversation', (conversationId) => {
      if (conversationId) {
        socket.join(`conv_${conversationId}`);
      }
    });

    // Leave conversation room
    socket.on('leave_conversation', (conversationId) => {
      if (conversationId) {
        socket.leave(`conv_${conversationId}`);
      }
    });

    // Typing indicators
    socket.on('typing_start', ({ conversationId }) => {
      if (conversationId) {
        socket.to(`conv_${conversationId}`).emit('user_typing', {
          conversationId,
          userId,
        });
      }
    });

    socket.on('typing_stop', ({ conversationId }) => {
      if (conversationId) {
        socket.to(`conv_${conversationId}`).emit('user_stopped_typing', {
          conversationId,
          userId,
        });
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      const userSockets = onlineUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);
          // Broadcast that user is offline
          io.emit('user:status', { userId, status: 'offline' });
        }
      }
    });
  });
};
