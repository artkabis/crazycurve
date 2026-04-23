import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { RoomManager } from './game/RoomManager.ts';
import type { ClientToServerEvents, ServerToClientEvents } from '../../src/network/protocol.ts';

const PORT = Number(process.env.PORT ?? 3001);

const app = express();
const httpServer = createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: '*' },
});

const rooms = new RoomManager(io);

io.on('connection', (socket) => {
  let currentRoomId: string | null = null;

  socket.on('join', ({ name, roomId }) => {
    const room = rooms.join(socket, name ?? 'Player', roomId);
    if (!room) {
      socket.emit('error', roomId ? 'Room not found or full.' : 'Could not join a room.');
      return;
    }

    currentRoomId = room.id;
    const players = [...io.sockets.adapter.rooms.get(room.id) ?? []].length;

    socket.emit('room_joined', {
      roomId: room.id,
      yourPlayerId: room.playerCount, // assigned ID = join order
      players: [],                    // client builds list from player_joined events
    });

    void players;
  });

  socket.on('input', ({ left, right }) => {
    if (!currentRoomId) return;
    rooms.getRoom(currentRoomId)?.receiveInput(socket.id, left, right);
  });

  socket.on('disconnect', () => {
    rooms.leave(socket.id);
  });
});

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok', rooms: io.sockets.adapter.rooms.size }));

httpServer.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});
