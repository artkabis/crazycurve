import express from 'express';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { Server } from 'socket.io';
import { RoomManager } from './game/RoomManager.ts';
import type { ClientToServerEvents, ServerToClientEvents } from '../../src/network/protocol.ts';

const IS_PROD = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT ?? 3001);

const app = express();
const httpServer = createServer(app);

if (IS_PROD) {
  const distPath = join(process.cwd(), 'dist');
  app.use(express.static(distPath, { maxAge: '1d' }));
  app.get('*', (_req, res) => res.sendFile(join(distPath, 'index.html')));
}

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: IS_PROD ? { origin: false } : { origin: '*' },
  transports: ['websocket', 'polling'],
});

const rooms = new RoomManager(io);

io.on('connection', (socket) => {
  let currentRoomId: string | null = null;

  socket.on('join', ({ name, roomId }) => {
    const result = rooms.join(socket, name ?? 'Player', roomId);
    if (!result) {
      socket.emit('error', roomId ? 'Room not found or full.' : 'Could not join a room.');
      return;
    }

    const { room, playerInfo, isReconnect } = result;
    currentRoomId = room.id;

    socket.emit('room_joined', {
      roomId: room.id,
      yourPlayerId: playerInfo.id,
      players: [],
      isReconnect,
    });
  });

  socket.on('input', ({ left, right }) => {
    if (currentRoomId) rooms.getRoom(currentRoomId)?.receiveInput(socket.id, left, right);
  });

  socket.on('disconnect', () => rooms.leave(socket.id));
});

app.get('/health', (_req, res) =>
  res.json({ status: 'ok', uptime: process.uptime(), rooms: io.sockets.adapter.rooms.size }),
);

httpServer.listen(PORT, () =>
  console.log(`[crazycurve] ${IS_PROD ? 'production' : 'dev'} server → http://localhost:${PORT}`),
);
