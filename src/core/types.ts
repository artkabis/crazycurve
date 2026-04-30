export interface Vec2 {
  readonly x: number;
  readonly y: number;
}

export interface InputState {
  readonly left: boolean;
  readonly right: boolean;
}

export type GamePhase = 'menu' | 'countdown' | 'playing' | 'round_over' | 'game_over';

export type PowerUpType =
  | 'speed_boost'
  | 'slow'
  | 'reverse'
  | 'freeze'
  | 'ghost'
  | 'thin'
  | 'thick'
  | 'teleport'
  | 'shield'
  | 'eraser'
  | 'missile';

export interface PickupRenderData {
  id: number;
  x: number;
  y: number;
  type: PowerUpType;
}

export interface MissileRenderData {
  id:      number;
  x:       number;
  y:       number;
  angle:   number;
  ownerId: number;
}

export interface CurveRenderData {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly angle: number;
  readonly alive: boolean;
  readonly inGap: boolean;
  readonly trailRadius: number;
  readonly ghostTrail: boolean;
  readonly activeEffects: readonly PowerUpType[];
  newPoints: Vec2[];
}

export interface IGameState {
  readonly phase: GamePhase;
  readonly round: number;
  readonly countdown: number;
  readonly curves: readonly CurveRenderData[];
  readonly pickups: readonly PickupRenderData[];
  readonly missiles: readonly MissileRenderData[];
  getScore(playerId: number): number;
}

export type GameEvents = {
  phaseChange: [phase: GamePhase];
  playerDied: [playerId: number];
  roundOver: [winnerId: number | null];
  gameOver: [winnerId: number];
  pickup: [type: PowerUpType, collectorId: number];
  eraseZone: [x: number, y: number, radius: number];
  missileHit: [ownerId: number, targetId: number | null, x: number, y: number];
};
