import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:4006'

export const useSocket = (onUpdateScreens?: (screens: any[]) => void) => {
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    const socket = io(SOCKET_URL)
    socketRef.current = socket

    socket.on('connect', () => {
      console.log('Socket connected')
    })

    if (onUpdateScreens) {
      socket.on('update-screens', onUpdateScreens)
    }

    return () => {
      socket.disconnect()
    }
  }, [onUpdateScreens])

  const controlScreen = (screenId: string, action: string, data?: any) => {
    socketRef.current?.emit('control-screen', { screenId, action, data })
  }

  return {
    controlScreen,
    socket: socketRef.current
  }
}
