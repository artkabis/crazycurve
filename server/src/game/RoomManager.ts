import type { Server, Socket } from 'socket.io';
import { Room } from './Room.ts';
import type { ClientToServerEvents, ServerToClientEvents } from '../../../src/network/protocol.ts';

type IoServer = Server<ClientToServerEvents, ServerToClientEvents>;
type RoomSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

function makeId(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export class RoomManager {
  private readonly rooms = new Map<string, Room>();

  constructor(private readonly io: IoServer) {}

  join(socket: RoomSocket, name: string, roomId?: string): Room | null {
    let room: Room | null = null;

    if (roomId) {
      room = this.rooms.get(roomId) ?? null;
      if (!room || room.isFull || room.isRunning) return null;
    } else {
      // Find an available room or create one
      for (const r of this.rooms.values()) {
        if (!r.isFull && !r.isRunning) { room = r; break; }
      }
      if (!room) {
        room = this.createRoom();
      }
    }

    const playerInfo = room.addPlayer(socket, name);
    if (!playerInfo) return null;

    // Auto-start when enough players are present
    if (room.playerCount >= 2) {
      setTimeout(() => room!.tryStart(), 1000);
    }

    return room;
  }

  leave(socketId: string): void {
    for (const [id, room] of this.rooms) {
      if (room.isEmpty) {
        this.rooms.delete(id);
        continue;
      }
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
