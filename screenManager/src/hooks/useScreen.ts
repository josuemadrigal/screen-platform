import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useAuthStore } from "../store/authStore";
import { SOCKET_URL } from '../lib/config'

export interface Screen {
  socketId: string;
  screenName: string;
  status: "active" | "inactive" | "closed";
  playbackStatus?: "playing" | "paused";
  currentVideo?: {
    id: number;
    title: string;
    thumbnail: string;
  };
  screenshot?: string; // Base64 capture sent by the TV client
  lastUpdate: Date;
}

interface UseScreenOptions {
  screenName?: string;
}

export const useScreen = ({ screenName }: UseScreenOptions = {}) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connectedScreens, setConnectedScreens] = useState<Screen[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socketUrl = SOCKET_URL
    const newSocket = io(socketUrl, {
      transports: ["websocket"],
      // Admin JWT: required to receive the screen list and send control commands.
      auth: { token: useAuthStore.getState().token },
    });

    newSocket.on("connect", () => {
      console.log("Connected to Socket.IO server");
      setIsConnected(true);

      if (screenName) {
        newSocket.emit("screen-connect", screenName);
      }
    });

    newSocket.on("connected-screens", (screens) => {
      setConnectedScreens(screens);
    });

    newSocket.on("update-screens", (screens: Screen[]) => {
      setConnectedScreens(screens);
    });

    newSocket.on("connect_error", (error) => {
      console.error("Connection error:", error);
      setIsConnected(false);
    });

    newSocket.on("disconnect", () => {
      console.log("Disconnected from Socket.IO server");
      setIsConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [screenName]);

  const updateStatus = (status: "active" | "inactive" | "closed") => {
    if (socket?.connected) {
      socket.emit("update-screen-status", status);
    }
  };

  return {
    isConnected,
    connectedScreens,
    socket,
    updateStatus,
  };
};
