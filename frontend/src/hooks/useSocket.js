import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

export function useSocket(token) {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState(new Set());
  // Map of userId -> lastSeenAt date (populated when a user goes offline)
  const [lastSeenMap, setLastSeenMap] = useState(new Map());

  useEffect(() => {
    if (!token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setIsConnected(false);
      return;
    }

    // Connect to server (using Vite proxy or direct host)
    const socket = io('/', {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.warn('Socket handshake authentication failed:', err.message);
      setIsConnected(false);
    });

    // Receive full list of currently online users when first connecting
    socket.on('users:online_list', (userIds) => {
      setOnlineUserIds(new Set(userIds));
    });

    // Presence updates (online/offline with lastSeenAt for offline)
    socket.on('user:status', ({ userId, status, lastSeenAt }) => {
      setOnlineUserIds((prev) => {
        const next = new Set(prev);
        if (status === 'online') {
          next.add(userId);
        } else {
          next.delete(userId);
          // Record lastSeenAt for the user who went offline
          if (lastSeenAt) {
            setLastSeenMap((prev) => {
              const next = new Map(prev);
              next.set(userId, lastSeenAt);
              return next;
            });
          }
        }
        return next;
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token]);

  const joinConversation = (conversationId) => {
    if (socketRef.current && conversationId) {
      socketRef.current.emit('join_conversation', conversationId);
    }
  };

  const leaveConversation = (conversationId) => {
    if (socketRef.current && conversationId) {
      socketRef.current.emit('leave_conversation', conversationId);
    }
  };

  const emitTyping = (conversationId, isTyping) => {
    if (socketRef.current && conversationId) {
      socketRef.current.emit(isTyping ? 'typing_start' : 'typing_stop', { conversationId });
    }
  };

  return {
    socket: socketRef.current,
    isConnected,
    onlineUserIds,
    lastSeenMap,
    joinConversation,
    leaveConversation,
    emitTyping,
  };
}
