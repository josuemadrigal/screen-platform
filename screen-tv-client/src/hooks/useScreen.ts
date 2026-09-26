import { useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { SOCKET_URL } from '../lib/config'

export interface Screen {
  socketId: string
  screenName: string
  status: 'active' | 'inactive' | 'closed'
  playbackStatus?: 'playing' | 'paused'
  currentVideo?: {
    id: number
    title: string
    thumbnail: string
  }
  lastUpdate: Date
}

interface UseScreenOptions {
  screenName?: string
}

export const useScreen = ({ screenName }: UseScreenOptions = {}) => {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [connectedScreens, setConnectedScreens] = useState<Screen[]>([])
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    const socketUrl = SOCKET_URL
    
    const newSocket = io(socketUrl, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
    })

    newSocket.on('connect', () => {
      console.log('[TV] Conectado al servidor Socket.IO')
      setIsConnected(true)
      if (screenName) {
        newSocket.emit('screen-connect', screenName)
      }
    })

    newSocket.on('connected-screens', (screens) => {
      setConnectedScreens(screens)
    })

    newSocket.on('update-screens', (screens: Screen[]) => {
      setConnectedScreens(screens)
    })

    newSocket.on('connect_error', (error) => {
      console.error('[TV] Error de conexión:', error)
      setIsConnected(false)
    })

    newSocket.on('disconnect', () => {
      console.log('[TV] Desconectado del servidor')
      setIsConnected(false)
    })

    setSocket(newSocket)

    return () => {
      newSocket.close()
    }
  }, [screenName])

  const updateStatus = (status: 'active' | 'inactive' | 'closed') => {
    if (socket?.connected) {
      socket.emit('update-screen-status', status)
    }
  }

  return {
    isConnected,
    connectedScreens,
    socket,
    updateStatus,
  }
}
