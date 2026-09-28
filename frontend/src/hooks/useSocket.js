import { useEffect, useRef } from 'react'
import { connectSocket, disconnectSocket } from '../lib/socket.js'

export function useSocket(token) {
  const socketRef = useRef(null)

  useEffect(() => {
    if (!token) return
    socketRef.current = connectSocket(token)
    return () => disconnectSocket()
  }, [token])

  return socketRef.current
}
