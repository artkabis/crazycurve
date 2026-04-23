export interface Vec2 {
  readonly x: number;
  readonly y: number;
}

export interface InputState {
  readonly left: boolean;
  readonly right: boolean;
}

export type GamePhase = 'menu' | 'countdown' | 'playing' | 'round_over' | 'game_over';

// Minimal shape required by renderers — satisfied by both Curve (local) and ShadowCurve (network)
export interface CurveRenderData {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly alive: boolean;
  readonly inGap: boolean;
  readonly trailRadius: number;
  newPoints: Vec2[];
}

// Common state interface — implemented by GameEngine (local) and NetworkGameState (online)
export interface IGameState {
  readonly phase: GamePhase;
  readonly round: number;
  readonly countdown: number;
  readonly curves: readonly CurveRenderData[];
  getScore(playerId: number): number;
}

// Events emitted by GameEngine
export type GameEvents = {
  phaseChange: [phase: GamePhase];
  playerDied: [playerId: number];
  roundOver: [winnerId: number | null];
  gameOver: [winnerId: number];
};
