import {
  ARENA_WIDTH,
  ARENA_HEIGHT,
  PLAYER_CONFIGS,
  SCORE_TO_WIN,
  COUNTDOWN_SECONDS,
  ROUND_OVER_DELAY_MS,
  getPalette,
} from './constants.ts';
import { CollisionSystem } from './systems/CollisionSystem.ts';
import { ScoreSystem } from './systems/ScoreSystem.ts';
import { PowerUpSystem } from './systems/PowerUpSystem.ts';
import { Curve } from './entities/Curve.ts';
import { TypedEventEmitter } from './EventEmitter.ts';
import type { GamePhase, GameEvents, InputState, IGameState, CurveRenderData, PickupRenderData } from './types.ts';

function randomSpawn(index: number, total: number): { x: number; y: number; angle: number } {
  const margin = 100;
  const sliceW = (ARENA_WIDTH - margin * 2) / total;
  return {
    x: margin + sliceW * index + Math.random() * sliceW,
    y: margin + Math.random() * (ARENA_HEIGHT - margin * 2),
    angle: Math.random() * Math.PI * 2,
  };
}

export class GameEngine extends TypedEventEmitter<GameEvents> implements IGameState {
  readonly collision = new CollisionSystem();
  readonly scores: ScoreSystem;
  readonly curves: Curve[];

  phase: GamePhase = 'menu';
  round = 0;
  countdown = COUNTDOWN_SECONDS;

  private readonly powerUps = new PowerUpSystem(
    (type, id) => this.emit('pickup', type, id),
    (x, y, r) => this.emit('eraseZone', x, y, r),
  );
  private engineTick = 0;
  private countdownStart = 0;
  private roundOverAt = 0;
  private roundOverHandled = false;

  constructor(
    playerIds: readonly number[] = PLAYER_CONFIGS.map((p) => p.id),
    private readonly scoreToWin: number = SCORE_TO_WIN,
  ) {
    super();
    this.scores = new ScoreSystem(playerIds);
    this.curves = playerIds.map((id) => {
      const cfg = getPalette(id);
      return new Curve(cfg.id, cfg.color);
    });
  }

  get pickups(): readonly PickupRenderData[] {
    return this.powerUps.getPickupsSnapshot();
  }

  getScore(playerId: number): number {
    return this.scores.getScore(playerId);
  }

  startGame(): void {
    this.scores.reset();
    this.round = 0;
    this.engineTick = 0;
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
    this.powerUps.reset();
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
    this.engineTick++;
    this.powerUps.update(this.curves, this.collision, this.engineTick);

    const newlyDead: number[] = [];
    for (const curve of this.curves) {
      const wasAlive = curve.alive;
      const input = inputs.get(curve.id) ?? { left: false, right: false };
      curve.update(input, this.collision);
      if (wasAlive && !curve.alive) newlyDead.push(curve.id);
    }

    // Original Curve Fever rule: +1 to every still-alive player for each death
    for (const deadId of newlyDead) {
      this.emit('playerDied', deadId);
      for (const c of this.curves) {
        if (c.alive) this.scores.addPoint(c.id);
      }
    }

    if (this.roundOverHandled) return;

    const alive = this.curves.filter((c) => c.alive);
    if (alive.length <= 1) {
      this.roundOverHandled = true;
      this.roundOverAt = now;
      this.setPhase('round_over');
      this.emit('roundOver', alive[0]?.id ?? null);
    }
  }

  private tickRoundOver(now: number): void {
    if (now - this.roundOverAt < ROUND_OVER_DELAY_MS) return;

    const gameWinnerId = this.scores.getWinner(this.scoreToWin);
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

export type { CurveRenderData };
