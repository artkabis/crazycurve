import { io, type Socket } from 'socket.io-client';
import type {
  ClientToServerEvents, ServerToClientEvents,
  TickPayload, RoomJoinedPayload, PlayerInfo,
} from './protocol.ts';

type NetSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const MAX_RECONNECT = 5;

type NetworkEvents = {
  room_joined: (payload: RoomJoinedPayload) => void;
  player_joined: (player: PlayerInfo) => void;
  player_left: (playerId: number) => void;
  game_start: () => void;
  tick: (payload: TickPayload) => void;
  error: (message: string) => void;
  disconnect: () => void;
};

export class NetworkManager {
  private socket: NetSocket | null = null;
  private currentTick = 0;
  private savedName?: string;
  private savedRoomId?: string;

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = io({
        transports: ['websocket', 'polling'],
        reconnectionAttempts: MAX_RECONNECT,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 4000,
      });

      // Auto-rejoin saved room after socket.io reconnects
      this.socket.io.on('reconnect', () => {
        if (this.savedName) {
          this.socket?.emit('join', { name: this.savedName, roomId: this.savedRoomId });
        }
      });

      this.socket.once('connect', () => resolve());
      this.socket.once('connect_error', (err) => reject(err));
    });
  }

  disconnect(): void {
    this.savedName = undefined;
    this.savedRoomId = undefined;
    this.socket?.disconnect();
    this.socket = null;
    this.currentTick = 0;
  }

  join(name: string, roomId?: string): void {
    this.savedName = name;
    this.savedRoomId = roomId;
    this.socket?.emit('join', { name, roomId });
  }

  sendInput(left: boolean, right: boolean): void {
    this.currentTick++;
    this.socket?.emit('input', { tick: this.currentTick, left, right });
  }

  on<K extends keyof NetworkEvents>(event: K, listener: NetworkEvents[K]): void {
    if (!this.socket) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.socket.on(event as any, listener as any);
  }

  off<K extends keyof NetworkEvents>(event: K, listener: NetworkEvents[K]): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.socket?.off(event as any, listener as any);
  }

  /** Called once when the socket drops during a live game. */
  onDisconnect(cb: () => void): void {
    this.socket?.on('disconnect', cb);
  }

  /** Called before each reconnection attempt. */
  onReconnecting(cb: (attempt: number, max: number) => void): void {
    this.socket?.io.on('reconnect_attempt', (attempt) => cb(attempt, MAX_RECONNECT));
  }

  /** Called after all reconnection attempts have failed. */
  onReconnectFailed(cb: () => void): void {
    this.socket?.io.on('reconnect_failed', cb);
  }

  get connected(): boolean {
    return this.socket?.connected ?? false;
  }
}
