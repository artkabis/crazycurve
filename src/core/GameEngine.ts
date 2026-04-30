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
import { MissileSystem } from './systems/MissileSystem.ts';
import { Curve } from './entities/Curve.ts';
import { TypedEventEmitter } from './EventEmitter.ts';
import type {
  GamePhase, GameEvents, InputState, IGameState,
  CurveRenderData, PickupRenderData, MissileRenderData,
} from './types.ts';

function randomSpawn(index: number, total: number): { x: number; y: number; angle: number } {
  const margin = 100;
  const sliceW = (ARENA_WIDTH - margin * 2) / total;
  const x      = margin + sliceW * index + Math.random() * sliceW;
  const y      = margin + Math.random() * (ARENA_HEIGHT - margin * 2);
  const toCenter = Math.atan2(ARENA_HEIGHT / 2 - y, ARENA_WIDTH / 2 - x);
  const angle    = toCenter + (Math.random() - 0.5) * (Math.PI * 2 / 3);
  return { x, y, angle };
}

export class GameEngine extends TypedEventEmitter<GameEvents> implements IGameState {
  readonly collision: CollisionSystem;
  readonly scores: ScoreSystem;
  readonly curves: Curve[];

  phase: GamePhase = 'menu';
  round            = 0;
  countdown        = COUNTDOWN_SECONDS;

  private readonly missileSystem: MissileSystem;
  private readonly powerUps: PowerUpSystem;
  private engineTick       = 0;
  private countdownStart   = 0;
  private roundOverAt      = 0;
  private roundOverHandled = false;

  constructor(
    playerIds: readonly number[]        = PLAYER_CONFIGS.map((p) => p.id),
    private readonly scoreToWin: number = SCORE_TO_WIN,
    readonly tickRate: number           = 60,
  ) {
    super();
    this.collision     = new CollisionSystem();
    this.missileSystem = new MissileSystem();
    this.powerUps      = new PowerUpSystem(
      (type, id) => this.emit('pickup', type, id),
      (x, y, r)  => this.emit('eraseZone', x, y, r),
      (curve)    => this.missileSystem.fire(curve, this.tickRate),
    );
    this.scores = new ScoreSystem(playerIds);
    this.curves = playerIds.map((id) => {
      const cfg = getPalette(id);
      return new Curve(cfg.id, cfg.color);
    });
  }

  get pickups(): readonly PickupRenderData[] {
    return this.powerUps.getPickupsSnapshot();
  }

  get missiles(): readonly MissileRenderData[] {
    return this.missileSystem.getSnapshot();
  }

  getScore(playerId: number): number {
    return this.scores.getScore(playerId);
  }

  startGame(): void {
    this.scores.reset();
    this.round      = 0;
    this.engineTick = 0;
    this.beginRound();
  }

  update(inputs: Map<number, InputState>, now: number): void {
    switch (this.phase) {
      case 'countdown':  this.tickCountdown(now);        break;
      case 'playing':    this.tickPlaying(inputs, now);  break;
      case 'round_over': this.tickRoundOver(now);        break;
    }
  }

  private beginRound(): void {
    this.round++;
    this.collision.reset();
    this.powerUps.reset();
    this.missileSystem.reset();
    this.roundOverHandled = false;

    this.curves.forEach((curve, i) => {
      const pos = randomSpawn(i, this.curves.length);
      curve.reset(pos.x, pos.y, pos.angle, this.tickRate);
    });

    this.countdown      = COUNTDOWN_SECONDS;
    this.countdownStart = performance.now();
    this.setPhase('countdown');
  }

  private tickCountdown(now: number): void {
    const elapsed   = now - this.countdownStart;
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
    this.powerUps.update(this.curves, this.collision, this.engineTick, this.tickRate);
    this.missileSystem.update(this.curves, this.collision, (ownerId, targetId, x, y) => {
      this.emit('missileHit', ownerId, targetId, x, y);
      if (targetId !== null) {
        this.emit('playerDied', targetId);
        for (const c of this.curves) {
          if (c.alive) this.scores.addPoint(c.id);
        }
      }
    });

    const newlyDead: number[] = [];
    for (const curve of this.curves) {
      const wasAlive = curve.alive;
      const input    = inputs.get(curve.id) ?? { left: false, right: false };
      curve.update(input, this.collision);
      if (wasAlive && !curve.alive) newlyDead.push(curve.id);
    }

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
