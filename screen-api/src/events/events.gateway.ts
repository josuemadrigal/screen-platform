import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

interface ScreenConnection {
  socketId: string;
  screenName: string;
  status: 'active' | 'inactive' | 'closed';
  playbackStatus: 'playing' | 'paused';
  currentVideo?: {
    id: number;
    title: string;
    thumbnail: string;
  };
  screenshot?: string; // Captura en tiempo real (Base64)
  lastUpdate: Date;
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private screens: Map<string, ScreenConnection> = new Map();

  handleConnection(socket: Socket) {
    console.log(`Nueva pantalla conectada: ${socket.id}`);
    this.broadcastScreenList();
  }

  handleDisconnect(socket: Socket) {
    console.log(`Pantalla desconectada: ${socket.id}`);
    this.screens.delete(socket.id);
    this.broadcastScreenList();
  }

  @SubscribeMessage('screen-connect')
  handleScreenConnect(@ConnectedSocket() socket: Socket, @MessageBody() screenName: string) {
    const screenConnection: ScreenConnection = {
      socketId: socket.id,
      screenName,
      status: 'active',
      playbackStatus: 'playing',
      lastUpdate: new Date(),
    };
    this.screens.set(socket.id, screenConnection);
    this.broadcastScreenList();
  }

  @SubscribeMessage('update-screen-status')
  handleUpdateStatus(@ConnectedSocket() socket: Socket, @MessageBody() data: any) {
    const screen = this.screens.get(socket.id);
    if (screen) {
      console.log(`Actualización de estado recibida de ${socket.id}:`, data);
      if (typeof data === 'string') {
        screen.status = data as any;
      } else {
        if (data.status !== undefined) screen.status = data.status;
        if (data.playbackStatus !== undefined) screen.playbackStatus = data.playbackStatus;
        if (data.hasOwnProperty('currentVideo')) screen.currentVideo = data.currentVideo;
        if (data.screenshot !== undefined) screen.screenshot = data.screenshot;
      }
      screen.lastUpdate = new Date();
      this.broadcastScreenList();
    }
  }

  @SubscribeMessage('control-screen')
  handleControlScreen(@MessageBody() data: { action: string; data?: any; screenId: string }) {
    console.log('Evento control-screen recibido:', data);
    const { action, data: actionData, screenId } = data;
    
    // Actualizar estado local si es un comando de play/pause
    const screen = this.screens.get(screenId);
    if (screen) {
      if (action === 'play') screen.playbackStatus = 'playing';
      if (action === 'pause') screen.playbackStatus = 'paused';
      this.broadcastScreenList();
    }

    this.server.to(screenId).emit('control-screen', { action, data: actionData });
  }

  @SubscribeMessage('get-one-screen')
  handleGetOneScreen(@ConnectedSocket() socket: Socket) {
    const screen = this.screens.get(socket.id);
    socket.emit('one-screen-update', screen || null);
  }

  /**
   * Sends a "reload-screen" command to every connected TV client linked with the
   * given screen code. Returns how many clients were notified.
   */
  reloadScreensByCode(code: string): number {
    const targets = Array.from(this.screens.values()).filter(
      (screen) => screen.screenName === code,
    );
    for (const screen of targets) {
      this.server.to(screen.socketId).emit('control-screen', { action: 'reload-screen' });
    }
    if (targets.length > 0) {
      console.log(`Recarga enviada a ${targets.length} pantalla(s) con código ${code}`);
    }
    return targets.length;
  }

  private broadcastScreenList() {
    const screenList = Array.from(this.screens.values());
    console.log('Pantallas conectadas:', screenList);
    this.server.emit('update-screens', screenList);
  }
}
