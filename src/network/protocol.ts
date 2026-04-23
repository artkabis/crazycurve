import type { GamePhase, PowerUpType } from '../core/types.ts';

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
  trailRadius: number;
  ghostTrail: boolean;
}

export interface PickupSnapshot {
  id: number;
  x: number;
  y: number;
  type: PowerUpType;
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
  pickups: PickupSnapshot[];
}

export interface RoomJoinedPayload {
  roomId: string;
  yourPlayerId: number;
  players: PlayerInfo[];
}

export interface ClientToServerEvents {
  join: (payload: { name: string; roomId?: string }) => void;
  input: (payload: { tick: number; left: boolean; right: boolean }) => void;
  ready: () => void;
}

export interface ServerToClientEvents {
  room_joined: (payload: RoomJoinedPayload) => void;
  player_joined: (player: PlayerInfo) => void;
  player_left: (playerId: number) => void;
  game_start: () => void;
  tick: (payload: TickPayload) => void;
  error: (message: string) => void;
}
