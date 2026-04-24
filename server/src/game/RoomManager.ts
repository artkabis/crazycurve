import type { Server, Socket } from 'socket.io';
import { Room } from './Room.ts';
import type {
  ClientToServerEvents, ServerToClientEvents, PlayerInfo,
} from '../../../src/network/protocol.ts';

type IoServer = Server<ClientToServerEvents, ServerToClientEvents>;
type RoomSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

interface JoinResult {
  room: Room;
  playerInfo: PlayerInfo;
  isReconnect: boolean;
}

function makeId(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export class RoomManager {
  private readonly rooms = new Map<string, Room>();

  constructor(private readonly io: IoServer) {}

  join(socket: RoomSocket, name: string, roomId?: string): JoinResult | null {
    let room: Room | null = null;
    let isReconnect = false;

    if (roomId) {
      room = this.rooms.get(roomId) ?? null;
      if (!room) return null;
      // Running rooms only accept reconnecting players (handled inside Room.addPlayer)
      if (room.isRunning) isReconnect = true;
      else if (room.isFull) return null;
    } else {
      for (const r of this.rooms.values()) {
        if (!r.isFull && !r.isRunning) { room = r; break; }
      }
      if (!room) room = this.createRoom();
    }

    const playerInfo = room.addPlayer(socket, name);
    if (!playerInfo) return null;

    if (!room.isRunning && room.playerCount >= 2) {
      setTimeout(() => room!.tryStart(), 1000);
    }

    return { room, playerInfo, isReconnect };
  }

  leave(socketId: string): void {
    for (const [id, room] of this.rooms) {
      if (room.isEmpty) { this.rooms.delete(id); continue; }
      room.removePlayer(socketId);
      if (room.isEmpty) this.rooms.delete(id);
    }
  }

  getRoom(id: string): Room | undefined {
    return this.rooms.get(id);
  }

  private createRoom(): Room {
    const id = makeId();
    const room = new Room(id, this.io);
    this.rooms.set(id, room);
    return room;
  }
}
