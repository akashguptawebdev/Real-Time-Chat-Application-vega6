import { io } from 'socket.io-client'

let socket = null

export const connectSocket = (token) => {
  if (socket?.connected) return socket

  socket = io('http://localhost:5000', {
    auth: { token },
    withCredentials: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  })

  socket.on('connect', () => console.log('🔌 Socket connected'))
  socket.on('disconnect', (reason) => console.warn('⚠️ Socket disconnected:', reason))
  socket.on('connect_error', (err) => console.error('❌ Socket error:', err.message))

  return socket
}

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

export const getSocket = () => socket
