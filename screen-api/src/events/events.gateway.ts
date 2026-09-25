import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';

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

/** Per-socket state kept in socket.data */
interface SocketState {
  /** True when the handshake carried a valid admin JWT (panel). */
  isAdmin: boolean;
  /** True once the socket registered as a TV with a valid screen code. */
  isScreen: boolean;
}

const ADMIN_ROOM = 'admins';

/**
 * Two kinds of clients connect here:
 *  - Admin panels: authenticate with a JWT in the handshake (`auth.token`). Only they receive
 *    the connected-screen list (which carries screenshots) and may send control commands.
 *  - TV clients: connect without a token and register with `screen-connect` using a screen
 *    code that must exist in the database. They may only report their own status.
 */
@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',').map((o) => o.trim()).filter(Boolean) || '*',
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);
  private screens: Map<string, ScreenConnection> = new Map();

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  private state(socket: Socket): SocketState {
    if (!socket.data.state) socket.data.state = { isAdmin: false, isScreen: false } as SocketState;
    return socket.data.state as SocketState;
  }

  async handleConnection(socket: Socket) {
    const state = this.state(socket);
    const token: string | undefined =
      socket.handshake.auth?.token ||
      (socket.handshake.headers.authorization?.startsWith('Bearer ')
        ? socket.handshake.headers.authorization.slice(7)
        : undefined);

    if (token) {
      try {
        const payload = this.jwtService.verify(token);
        const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
        if (user) {
          state.isAdmin = true;
          socket.join(ADMIN_ROOM);
          // New admin gets the current list right away.
          socket.emit('update-screens', Array.from(this.screens.values()));
          this.logger.log(`Admin conectado: ${socket.id} (${user.user})`);
          return;
        }
      } catch {
        // Invalid or expired token: treat as an unauthenticated (TV) socket.
      }
    }
    this.logger.debug(`Socket sin autenticar: ${socket.id} (pendiente de screen-connect)`);
  }

  handleDisconnect(socket: Socket) {
    if (this.screens.delete(socket.id)) {
      this.logger.log(`Pantalla desconectada: ${socket.id}`);
      this.broadcastScreenList();
    }
  }

  @SubscribeMessage('screen-connect')
  async handleScreenConnect(@ConnectedSocket() socket: Socket, @MessageBody() screenName: string) {
    const code = typeof screenName === 'string' ? screenName.trim() : '';
    const screen = code ? await this.prisma.screen.findUnique({ where: { code } }) : null;

    if (!screen || screen.status !== 1) {
      this.logger.warn(`screen-connect rechazado para código "${code}" desde ${socket.id}`);
      socket.emit('screen-connect-error', { code, message: 'Código de pantalla no válido o inactivo' });
      return;
    }

    this.state(socket).isScreen = true;
    this.screens.set(socket.id, {
      socketId: socket.id,
      screenName: code,
      status: 'active',
      playbackStatus: 'playing',
      lastUpdate: new Date(),
    });
    socket.emit('screen-connect-ok', { code });
    this.logger.log(`Pantalla conectada: ${code} (${socket.id})`);
    this.broadcastScreenList();
  }

  @SubscribeMessage('update-screen-status')
  handleUpdateStatus(@ConnectedSocket() socket: Socket, @MessageBody() data: any) {
    if (!this.state(socket).isScreen) return;
    const screen = this.screens.get(socket.id);
    if (!screen) return;

    if (typeof data === 'string') {
      screen.status = data as any;
    } else if (data && typeof data === 'object') {
      if (data.status !== undefined) screen.status = data.status;
      if (data.playbackStatus !== undefined) screen.playbackStatus = data.playbackStatus;
      if (Object.prototype.hasOwnProperty.call(data, 'currentVideo')) screen.currentVideo = data.currentVideo;
      if (data.screenshot !== undefined) screen.screenshot = data.screenshot;
    }
    screen.lastUpdate = new Date();
    this.broadcastScreenList();
  }

  @SubscribeMessage('control-screen')
  handleControlScreen(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { action: string; data?: any; screenId: string },
  ) {
    if (!this.state(socket).isAdmin) {
      this.logger.warn(`control-screen rechazado: socket ${socket.id} no es admin`);
      socket.emit('unauthorized', { message: 'Se requiere sesión de administrador' });
      return;
    }
    const { action, data: actionData, screenId } = data || ({} as any);
    const screen = this.screens.get(screenId);
    if (!screen) return;

    if (action === 'play') screen.playbackStatus = 'playing';
    if (action === 'pause') screen.playbackStatus = 'paused';
    this.broadcastScreenList();

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
    const targets = Array.from(this.screens.values()).filter((screen) => screen.screenName === code);
    for (const screen of targets) {
      this.server.to(screen.socketId).emit('control-screen', { action: 'reload-screen' });
    }
    if (targets.length > 0) {
      this.logger.log(`Recarga enviada a ${targets.length} pantalla(s) con código ${code}`);
    }
    return targets.length;
  }

  /** The screen list (with screenshots) only goes to authenticated admin panels. */
  private broadcastScreenList() {
    const screenList = Array.from(this.screens.values());
    this.server.to(ADMIN_ROOM).emit('update-screens', screenList);
  }
}
