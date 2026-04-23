import {
  PLAYER_SPEED,
  TURN_RATE,
  TRAIL_RADIUS,
  GAP_INTERVAL_MIN,
  GAP_INTERVAL_MAX,
  GAP_DURATION_MIN,
  GAP_DURATION_MAX,
  STARTUP_GAP_FRAMES,
} from '../constants.ts';
import type { InputState, Vec2, PowerUpType } from '../types.ts';
import type { CollisionSystem } from '../systems/CollisionSystem.ts';

function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

export class Curve {
  readonly id: number;
  readonly color: number;

  x = 0;
  y = 0;
  angle = 0;
  alive = true;

  speed = PLAYER_SPEED;
  turnRate = TURN_RATE;
  trailRadius = TRAIL_RADIUS;

  inverseControls = false;
  frozen = false;
  ghostTrail = false;

  private effects = new Map<PowerUpType, number>(); // type → expiresAtTick

  private gapActive = true;
  private gapTimer = 0;
  private gapDuration = STARTUP_GAP_FRAMES;
  private nextGapIn = 0;

  newPoints: Vec2[] = [];

  constructor(id: number, color: number) {
    this.id = id;
    this.color = color;
  }

  reset(x: number, y: number, angle: number): void {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.alive = true;
    this.effects.clear();
    this.inverseControls = false;
    this.frozen = false;
    this.ghostTrail = false;
    this.speed = PLAYER_SPEED;
    this.turnRate = TURN_RATE;
    this.trailRadius = TRAIL_RADIUS;
    this.gapActive = true;
    this.gapTimer = 0;
    this.gapDuration = STARTUP_GAP_FRAMES;
    this.nextGapIn = randInt(GAP_INTERVAL_MIN, GAP_INTERVAL_MAX);
    this.newPoints = [];
  }

  get inGap(): boolean {
    return this.gapActive;
  }

  applyEffect(type: PowerUpType, expiresAtTick: number): void {
    this.effects.set(type, expiresAtTick);
    this.recalcEffects();
  }

  tickEffects(currentTick: number): void {
    let changed = false;
    for (const [type, exp] of this.effects) {
      if (currentTick >= exp) {
        this.effects.delete(type);
        changed = true;
      }
    }
    if (changed) this.recalcEffects();
  }

  teleport(x: number, y: number, newAngle: number): void {
    this.x = x;
    this.y = y;
    this.angle = newAngle;
    // Brief gap so the teleported curve doesn't immediately self-collide
    this.gapActive = true;
    this.gapTimer = 0;
    this.gapDuration = 20;
  }

  private recalcEffects(): void {
    this.inverseControls = this.effects.has('reverse');
    this.frozen = this.effects.has('freeze');
    this.ghostTrail = this.effects.has('ghost');
    this.speed = this.effects.has('speed_boost') ? PLAYER_SPEED * 1.7
               : this.effects.has('slow')        ? PLAYER_SPEED * 0.5
               : PLAYER_SPEED;
    this.trailRadius = this.effects.has('thin')  ? TRAIL_RADIUS * 0.5
                     : this.effects.has('thick') ? TRAIL_RADIUS * 2.5
                     : TRAIL_RADIUS;
  }

  update(input: InputState, collision: CollisionSystem): void {
    if (!this.alive) return;
    if (this.frozen) return;

    this.newPoints = [];

    const left  = this.inverseControls ? input.right : input.left;
    const right = this.inverseControls ? input.left  : input.right;

    if (left)  this.angle -= this.turnRate;
    if (right) this.angle += this.turnRate;

    const nx = this.x + Math.cos(this.angle) * this.speed;
    const ny = this.y + Math.sin(this.angle) * this.speed;

    const hitWall  = collision.checkWall(nx, ny, this.trailRadius);
    const hitTrail = !this.gapActive && !this.ghostTrail && collision.checkTrail(nx, ny);

    if (hitWall || hitTrail) {
      this.alive = false;
      return;
    }

    this.x = nx;
    this.y = ny;

    if (!this.gapActive) {
      if (!this.ghostTrail) {
        collision.paint(this.x, this.y, this.id, this.trailRadius);
      }
      this.newPoints.push({ x: this.x, y: this.y });
    }

    this.tickGap();
  }

  private tickGap(): void {
    this.gapTimer++;
    if (this.gapActive) {
      if (this.gapTimer >= this.gapDuration) {
        this.gapActive = false;
        this.gapTimer = 0;
        this.nextGapIn = randInt(GAP_INTERVAL_MIN, GAP_INTERVAL_MAX);
      }
    } else {
      if (this.gapTimer >= this.nextGapIn) {
        this.gapActive = true;
        this.gapTimer = 0;
        this.gapDuration = randInt(GAP_DURATION_MIN, GAP_DURATION_MAX);
      }
    }
  }
}
