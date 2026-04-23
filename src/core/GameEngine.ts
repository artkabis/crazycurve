import {
  ARENA_WIDTH,
  ARENA_HEIGHT,
  PLAYER_CONFIGS,
  ROUNDS_TO_WIN,
  COUNTDOWN_SECONDS,
  ROUND_OVER_DELAY_MS,
} from './constants.ts';
import { CollisionSystem } from './systems/CollisionSystem.ts';
import { ScoreSystem } from './systems/ScoreSystem.ts';
import { Curve } from './entities/Curve.ts';
import { TypedEventEmitter } from './EventEmitter.ts';
import type { GamePhase, GameEvents, InputState } from './types.ts';

function randomSpawn(index: number, total: number): { x: number; y: number; angle: number } {
  const margin = 100;
  const sliceW = (ARENA_WIDTH - margin * 2) / total;
  return {
    x: margin + sliceW * index + Math.random() * sliceW,
    y: margin + Math.random() * (ARENA_HEIGHT - margin * 2),
    angle: Math.random() * Math.PI * 2,
  };
}

export class GameEngine extends TypedEventEmitter<GameEvents> {
  readonly collision = new CollisionSystem();
  readonly scores = new ScoreSystem();
  readonly curves: Curve[];

  phase: GamePhase = 'menu';
  round = 0;
  countdown = COUNTDOWN_SECONDS;

  private countdownStart = 0;
  private roundOverAt = 0;
  private roundOverHandled = false;

  constructor() {
    super();
    this.curves = PLAYER_CONFIGS.map((cfg) => new Curve(cfg.id, cfg.color));
  }

  startGame(): void {
    this.scores.reset();
    this.round = 0;
    this.beginRound();
  }

  update(inputs: Map<number, InputState>, now: number): void {
    switch (this.phase) {
      case 'countdown':
        this.tickCountdown(now);
        break;
      case 'playing':
        this.tickPlaying(inputs, now);
        break;
      case 'round_over':
        this.tickRoundOver(now);
        break;
    }
  }

  private beginRound(): void {
    this.round++;
    this.collision.reset();
    this.roundOverHandled = false;

    this.curves.forEach((curve, i) => {
      const pos = randomSpawn(i, this.curves.length);
      curve.reset(pos.x, pos.y, pos.angle);
    });

    this.countdown = COUNTDOWN_SECONDS;
    this.countdownStart = performance.now();
    this.setPhase('countdown');
  }

  private tickCountdown(now: number): void {
    const elapsed = now - this.countdownStart;
    const remaining = Math.ceil(COUNTDOWN_SECONDS - elapsed / 1000);

    if (remaining !== this.countdown) {
      this.countdown = Math.max(1, remaining);
    }
    if (elapsed >= COUNTDOWN_SECONDS * 1000) {
      this.setPhase('playing');
    }
  }

  private tickPlaying(inputs: Map<number, InputState>, now: number): void {
    for (const curve of this.curves) {
      const wasAlive = curve.alive;
      const input = inputs.get(curve.id) ?? { left: false, right: false };
      curve.update(input, this.collision);
      if (wasAlive && !curve.alive) {
        this.emit('playerDied', curve.id);
      }
    }

    if (this.roundOverHandled) return;

    const alive = this.curves.filter((c) => c.alive);
    if (alive.length <= 1) {
      this.roundOverHandled = true;
      const winner = alive[0] ?? null;
      if (winner) this.scores.addPoint(winner.id);
      this.roundOverAt = now;
      this.setPhase('round_over');
      this.emit('roundOver', winner?.id ?? null);
    }
  }

  private tickRoundOver(now: number): void {
    if (now - this.roundOverAt < ROUND_OVER_DELAY_MS) return;

    const gameWinnerId = this.scores.getWinner(ROUNDS_TO_WIN);
    if (gameWinnerId !== null) {
      this.setPhase('game_over');
      this.emit('gameOver', gameWinnerId);
    } else {
      this.beginRound();
    }
  }

  private setPhase(phase: GamePhase): void {
    this.phase = phase;
    this.emit('phaseChange', phase);
  }
}
