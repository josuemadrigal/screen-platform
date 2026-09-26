import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '../store/authStore'
import { API_URL } from '../lib/config'

const SOCKET_URL = API_URL

export const useSocket = (onUpdateScreens?: (screens: any[]) => void) => {
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    // The API only sends the screen list and accepts control commands from sockets that carry the admin JWT.
    const socket = io(SOCKET_URL, { auth: { token: useAuthStore.getState().token } })
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
