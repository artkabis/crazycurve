import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents, TickPayload, RoomJoinedPayload, PlayerInfo } from './protocol.ts';

type NetSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

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

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Allow polling fallback — required for O2Switch Passenger which may block raw WS upgrades
      this.socket = io({ transports: ['websocket', 'polling'] });

      this.socket.once('connect', () => resolve());
      this.socket.once('connect_error', (err) => reject(err));
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
    this.currentTick = 0;
  }

  join(name: string, roomId?: string): void {
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

  get connected(): boolean {
    return this.socket?.connected ?? false;
  }
}
