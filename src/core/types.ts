export interface Vec2 {
  readonly x: number;
  readonly y: number;
}

export interface InputState {
  readonly left: boolean;
  readonly right: boolean;
}

export type GamePhase = 'menu' | 'countdown' | 'playing' | 'round_over' | 'game_over';

// Events emitted by GameEngine — typed for compile-time safety
export type GameEvents = {
  phaseChange: [phase: GamePhase];
  playerDied: [playerId: number];
  roundOver: [winnerId: number | null];
  gameOver: [winnerId: number];
};
