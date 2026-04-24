import type { Server, Socket } from 'socket.io';
import { GameEngine } from '../../../src/core/GameEngine.ts';
import {
  SERVER_TICK_MS,
  ROUNDS_TO_WIN,
  getPalette,
  MIN_PLAYERS,
  MAX_PLAYERS,
} from '../../../src/core/constants.ts';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  PlayerInfo,
  TickPayload,
  NetGameEvent,
  PickupSnapshot,
} from '../../../src/network/protocol.ts';

type IoServer = Server<ClientToServerEvents, ServerToClientEvents>;
type RoomSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

interface RoomPlayer {
  socket: RoomSocket;
  info: PlayerInfo;
  pendingInput: { left: boolean; right: boolean };
}

export class Room {
  readonly id: string;
  private readonly players = new Map<string, RoomPlayer>();
  private engine: GameEngine | null = null;
  private tickInterval: ReturnType<typeof setInterval> | null = null;
  private tick = 0;
  private pendingEvents: NetGameEvent[] = [];
  private nextId = 1;

  constructor(id: string, private readonly io: IoServer) {
    this.id = id;
  }

  get playerCount(): number { return this.players.size; }
  get isFull(): boolean { return this.players.size >= MAX_PLAYERS; }
  get isEmpty(): boolean { return this.players.size === 0; }
  get isRunning(): boolean { return this.tickInterval !== null; }

  addPlayer(socket: RoomSocket, name: string): PlayerInfo | null {
    if (this.isFull || this.isRunning) return null;
    if (this.nextId > MAX_PLAYERS) return null;

    const palette = getPalette(this.nextId);
    const info: PlayerInfo = {
      id: this.nextId++,
      name: name.slice(0, 16) || palette.name,
      color: palette.color,
      colorHex: palette.colorHex,
    };

    this.players.set(socket.id, { socket, info, pendingInput: { left: false, right: false } });
    socket.join(this.id);
    socket.to(this.id).emit('player_joined', info);
    return info;
  }

  removePlayer(socketId: string): void {
    const player = this.players.get(socketId);
    if (!player) return;
    this.players.delete(socketId);
    this.io.to(this.id).emit('player_left', player.info.id);
    if (this.players.size < MIN_PLAYERS) this.stopLoop();
  }

  receiveInput(socketId: string, left: boolean, right: boolean): void {
    const p = this.players.get(socketId);
    if (p) p.pendingInput = { left, right };
  }

  tryStart(): boolean {
    if (this.players.size < MIN_PLAYERS || this.isRunning) return false;

    const playerIds = [...this.players.values()].map((p) => p.info.id);
    this.engine = new GameEngine(playerIds);

    this.engine.on('playerDied', (id) => this.pendingEvents.push({ type: 'player_died', playerId: id }));
    this.engine.on('roundOver', (id) => this.pendingEvents.push({ type: 'round_over', winnerId: id ?? null }));
    this.engine.on('gameOver', (id) => this.pendingEvents.push({ type: 'game_over', winnerId: id }));
    this.engine.on('eraseZone', (x, y, r) => this.pendingEvents.push({ type: 'erase_zone', x, y, radius: r }));

    this.engine.startGame();
    this.io.to(this.id).emit('game_start');
    this.tickInterval = setInterval(() => this.gameTick(), SERVER_TICK_MS);
    return true;
  }

  private stopLoop(): void {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
    this.engine = null;
  }

  private gameTick(): void {
    const engine = this.engine;
    if (!engine) return;

    this.tick++;
    this.pendingEvents = [];

    const inputs = new Map(
      [...this.players.values()].map((p) => [p.info.id, p.pendingInput]),
    );

    engine.update(inputs, performance.now());

    for (const curve of engine.curves) curve.newPoints = [];

    const scores: Record<number, number> = {};
    for (const p of this.players.values()) {
      scores[p.info.id] = engine.scores.getScore(p.info.id);
    }

    const payload: TickPayload = {
      tick: this.tick,
      phase: engine.phase,
      round: engine.round,
      countdown: engine.countdown,
      players: engine.curves.map((c) => ({
        id: c.id,
        x: c.x,
        y: c.y,
        angle: c.angle,
        alive: c.alive,
        inGap: c.inGap,
        trailRadius: c.trailRadius,
        ghostTrail: c.ghostTrail,
        activeEffects: [...c.activeEffects],
      })),
      events: this.pendingEvents,
      scores,
      pickups: engine.pickups as PickupSnapshot[],
    };

    this.io.to(this.id).emit('tick', payload);

    if (engine.scores.getWinner(ROUNDS_TO_WIN) !== null) {
      this.stopLoop();
    }
  }
}
