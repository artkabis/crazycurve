import type { GamePhase } from '../core/types.ts';

// ── Shared payload types ────────────────────────────────────────

export interface PlayerInfo {
  id: number;
  name: string;
  color: number;
  colorHex: string;
}

export interface PlayerSnapshot {
  id: number;
  x: number;
  y: number;
  angle: number;
  alive: boolean;
  inGap: boolean;
}

export type NetGameEvent =
  | { type: 'player_died'; playerId: number }
  | { type: 'round_over'; winnerId: number | null }
  | { type: 'game_over'; winnerId: number };

export interface TickPayload {
  tick: number;
  phase: GamePhase;
  round: number;
  countdown: number;
  players: PlayerSnapshot[];
  events: NetGameEvent[];
  scores: Record<number, number>;
}

export interface RoomJoinedPayload {
  roomId: string;
  yourPlayerId: number;
  players: PlayerInfo[];
}

// ── Socket.io event maps ────────────────────────────────────────

/** Events sent from Client → Server */
export interface ClientToServerEvents {
  join: (payload: { name: string; roomId?: string }) => void;
  input: (payload: { tick: number; left: boolean; right: boolean }) => void;
  ready: () => void;
}

/** Events sent from Server → Client */
export interface ServerToClientEvents {
  room_joined: (payload: RoomJoinedPayload) => void;
  player_joined: (player: PlayerInfo) => void;
  player_left: (playerId: number) => void;
  game_start: () => void;
  tick: (payload: TickPayload) => void;
  error: (message: string) => void;
}
