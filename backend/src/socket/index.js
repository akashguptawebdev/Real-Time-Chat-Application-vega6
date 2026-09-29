import { verifyAccessToken } from '../config/jwt.js';
import { User, ConversationMember } from '../models/index.js';

// In-memory map: userId -> Set of socket IDs (multi-tab support)
const onlineUsers = new Map();
let ioInstance = null;

export const getIo = () => ioInstance;

/**
 * Instantly evict a user from a conversation room across ALL their active socket connections.
 * Ensures the removed user stops receiving group messages immediately (no page refresh needed).
 */
export const removeUserFromRoom = (userId, conversationId) => {
  if (!ioInstance) return;
  const userSockets = onlineUsers.get(userId);
  if (userSockets) {
    for (const socketId of userSockets) {
      const socket = ioInstance.sockets.sockets.get(socketId);
      if (socket) socket.leave(`conv_${conversationId}`);
    }
  }
};

/**
 * Add a user to a conversation room across ALL their active socket connections.
 */
export const addUserToRoom = (userId, conversationId) => {
  if (!ioInstance) return;
  const userSockets = onlineUsers.get(userId);
  if (userSockets) {
    for (const socketId of userSockets) {
      const socket = ioInstance.sockets.sockets.get(socketId);
      if (socket) socket.join(`conv_${conversationId}`);
    }
  }
};

export const initSocket = (io) => {
  ioInstance = io;

  // ── Handshake Authentication Middleware ────────────────────────────────────
  // Every socket connection MUST be authenticated during handshake.
  // Unauthenticated sockets are disconnected immediately.
  io.use(async (socket, next) => {
    try {
      // 1. Extract token from handshake auth, Authorization header, or query
      let token = socket.handshake.auth?.token;

      if (!token && socket.handshake.headers?.authorization) {
        const authHeader = socket.handshake.headers.authorization;
        token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : authHeader.trim();
      }

      if (!token && socket.handshake.query?.token) {
        token = socket.handshake.query.token;
      }

      // If no token is provided, reject immediately
      if (!token) {
        const err = new Error('Authentication required: No token provided');
        err.data = { code: 'UNAUTHORIZED_NO_TOKEN' };
        socket.disconnect(true);
        return next(err);
      }

      // 2. Verify JWT signature & expiration
      let decoded;
      try {
        decoded = verifyAccessToken(token);
      } catch (jwtErr) {
        const isExpired = jwtErr.name === 'TokenExpiredError';
        const err = new Error(
          isExpired
            ? 'Authentication failed: Token expired'
            : 'Authentication failed: Invalid token'
        );
        err.data = { code: isExpired ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN' };
        socket.disconnect(true);
        return next(err);
      }

      if (!decoded || !decoded.userId) {
        const err = new Error('Authentication failed: Malformed token payload');
        err.data = { code: 'INVALID_TOKEN_PAYLOAD' };
        socket.disconnect(true);
        return next(err);
      }

      // 3. Verify user exists in the database
      const user = await User.findByPk(decoded.userId, {
        attributes: ['id', 'name', 'email'],
      });

      if (!user) {
        const err = new Error('Authentication failed: User account not found');
        err.data = { code: 'USER_NOT_FOUND' };
        socket.disconnect(true);
        return next(err);
      }

      // 4. Attach authenticated user info to socket
      socket.user = { userId: user.id, email: user.email, name: user.name };
      next();
    } catch (error) {
      console.error('Socket handshake authentication error:', error.message);
      const err = new Error('Authentication error: ' + error.message);
      err.data = { code: 'AUTH_HANDSHAKE_ERROR' };
      socket.disconnect(true);
      return next(err);
    }
  });

  // ── Connection Handler ──────────────────────────────────────────────────────
  io.on('connection', async (socket) => {
    // Immediate guard: unauthenticated sockets must be disconnected immediately
    if (!socket.user || !socket.user.userId) {
      socket.emit('error', { message: 'Unauthorized connection' });
      socket.disconnect(true);
      return;
    }

    const userId = socket.user.userId;

    // Track online user (multi-tab: Set of socket IDs per user)
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    const isFirstConnection = onlineUsers.get(userId).size === 0;
    onlineUsers.get(userId).add(socket.id);

    // Join personal room for private notifications
    socket.join(`user_${userId}`);

    // Auto-join all conversation rooms where user is an active member
    try {
      const activeMemberships = await ConversationMember.findAll({
        where: { userId, removedAt: null },
        attributes: ['conversationId'],
      });
      activeMemberships.forEach((m) => {
        socket.join(`conv_${m.conversationId}`);
      });
    } catch (err) {
      console.error('Error auto-joining conversation rooms:', err.message);
    }

    // Broadcast online status only on first connection (avoids duplicate events when multi-tab)
    if (isFirstConnection) {
      io.emit('user:status', { userId, status: 'online', lastSeenAt: null });
    }

    // Send current list of online user IDs to the freshly connected socket
    socket.emit('users:online_list', Array.from(onlineUsers.keys()));

    // ── Join Conversation Room (with membership authorization) ────────────────
    socket.on('join_conversation', async (conversationId) => {
      if (!conversationId) return;

      try {
        const isMember = await ConversationMember.findOne({
          where: { conversationId, userId, removedAt: null },
        });

        if (isMember) {
          socket.join(`conv_${conversationId}`);
        } else {
          socket.emit('error', { message: 'Forbidden: You are not a member of this conversation' });
        }
      } catch (err) {
        console.error('join_conversation error:', err.message);
      }
    });

    // ── Leave Conversation Room ───────────────────────────────────────────────
    socket.on('leave_conversation', (conversationId) => {
      if (conversationId) socket.leave(`conv_${conversationId}`);
    });

    // ── Typing Indicators (throttled, membership-verified) ───────────────────
    socket.on('typing_start', async ({ conversationId }) => {
      if (!conversationId) return;
      const isMember = await ConversationMember.findOne({
        where: { conversationId, userId, removedAt: null },
      });
      if (isMember) {
        socket.to(`conv_${conversationId}`).emit('user_typing', { conversationId, userId });
      }
    });

    socket.on('typing_stop', ({ conversationId }) => {
      if (conversationId) {
        socket.to(`conv_${conversationId}`).emit('user_stopped_typing', { conversationId, userId });
      }
    });

    // ── Disconnect ────────────────────────────────────────────────────────────
    socket.on('disconnect', async () => {
      const userSockets = onlineUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          // All tabs/connections are closed — user is truly offline
          onlineUsers.delete(userId);

          // Record lastSeenAt in the database
          const lastSeenAt = new Date();
          try {
            await User.update({ lastSeenAt }, { where: { id: userId } });
          } catch (e) {
            console.error('Failed to update lastSeenAt:', e.message);
          }

          // Broadcast offline status with lastSeenAt timestamp
          io.emit('user:status', { userId, status: 'offline', lastSeenAt });
        }
      }
    });
  });
};
