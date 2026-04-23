import express from 'express';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { Server } from 'socket.io';
import { RoomManager } from './game/RoomManager.ts';
import type { ClientToServerEvents, ServerToClientEvents } from '../../src/network/protocol.ts';

const IS_PROD = process.env.NODE_ENV === 'production';
// Passenger (O2Switch) injects PORT automatically; fallback to 3001 for local dev
const PORT = Number(process.env.PORT ?? 3001);

const app = express();
const httpServer = createServer(app);

// ── Production: serve the Vite-built frontend ──────────────────
if (IS_PROD) {
  const distPath = join(process.cwd(), 'dist');
  app.use(express.static(distPath, { maxAge: '1d' }));
  // SPA fallback — always return index.html for unknown routes
  app.get('*', (_req, res) => res.sendFile(join(distPath, 'index.html')));
}

// ── Socket.io ──────────────────────────────────────────────────
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  // In production lock CORS to same origin; dev allows all origins (Vite proxy)
  cors: IS_PROD ? { origin: false } : { origin: '*' },
  // Allow polling fallback — essential when Passenger/LiteSpeed blocks raw WS upgrades
  transports: ['websocket', 'polling'],
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
    socket.emit('room_joined', {
      roomId: room.id,
      yourPlayerId: room.playerCount,
      players: [],
    });
  });

  socket.on('input', ({ left, right }) => {
    if (currentRoomId) rooms.getRoom(currentRoomId)?.receiveInput(socket.id, left, right);
  });

  socket.on('disconnect', () => rooms.leave(socket.id));
});

// ── Health check ───────────────────────────────────────────────
app.get('/health', (_req, res) =>
  res.json({ status: 'ok', uptime: process.uptime(), rooms: io.sockets.adapter.rooms.size }),
);

httpServer.listen(PORT, () =>
  console.log(`[crazycurve] ${IS_PROD ? 'production' : 'dev'} server → http://localhost:${PORT}`),
);
