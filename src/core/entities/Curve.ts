import {
  PLAYER_SPEED_PPS,
  TURN_RATE_RPS,
  TRAIL_RADIUS,
  GAP_INTERVAL_MIN_S,
  GAP_INTERVAL_MAX_S,
  GAP_DURATION_MIN_S,
  GAP_DURATION_MAX_S,
  STARTUP_GAP_S,
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

  speed       = 0;
  turnRate    = 0;
  trailRadius = TRAIL_RADIUS;

  inverseControls = false;
  frozen          = false;
  ghostTrail      = false;

  private effects   = new Map<PowerUpType, number>(); // type → expiresAtTick
  private tickRate  = 60;
  private baseSpeed = 0;

  private gapActive   = true;
  private gapTimer    = 0;
  private gapDuration = 0;
  private nextGapIn   = 0;

  newPoints: Vec2[] = [];

  constructor(id: number, color: number) {
    this.id    = id;
    this.color = color;
  }

  reset(x: number, y: number, angle: number, tickRate = 60): void {
    this.tickRate  = tickRate;
    this.baseSpeed = PLAYER_SPEED_PPS / tickRate;

    this.x     = x;
    this.y     = y;
    this.angle = angle;
    this.alive = true;

    this.effects.clear();
    this.inverseControls = false;
    this.frozen          = false;
    this.ghostTrail      = false;
    this.speed           = this.baseSpeed;
    this.turnRate        = TURN_RATE_RPS / tickRate;
    this.trailRadius     = TRAIL_RADIUS;

    this.gapActive   = true;
    this.gapTimer    = 0;
    this.gapDuration = Math.round(STARTUP_GAP_S * tickRate);
    this.nextGapIn   = randInt(
      Math.round(GAP_INTERVAL_MIN_S * tickRate),
      Math.round(GAP_INTERVAL_MAX_S * tickRate),
    );
    this.newPoints = [];
  }

  get inGap(): boolean { return this.gapActive; }
  get activeEffects(): readonly PowerUpType[] { return [...this.effects.keys()]; }
  get shielded(): boolean { return this.effects.has('shield'); }

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
    this.x     = x;
    this.y     = y;
    this.angle = newAngle;
    // Brief gap so the teleported curve doesn't immediately self-collide
    this.gapActive   = true;
    this.gapTimer    = 0;
    this.gapDuration = Math.round(0.5 * this.tickRate);
  }

  private recalcEffects(): void {
    this.inverseControls = this.effects.has('reverse');
    this.frozen          = this.effects.has('freeze');
    this.ghostTrail      = this.effects.has('ghost');
    this.speed = this.effects.has('speed_boost') ? this.baseSpeed * 1.7
               : this.effects.has('slow')        ? this.baseSpeed * 0.5
               : this.baseSpeed;
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

    // Leading-edge check: head centre + trailRadius forward.
    // Distance from last paint = speed + trailRadius > trailRadius at any tick rate.
    const leadX = nx + Math.cos(this.angle) * this.trailRadius;
    const leadY = ny + Math.sin(this.angle) * this.trailRadius;

    const hitWall  = collision.checkWall(nx, ny, this.trailRadius);
    const hitTrail = !this.gapActive && !this.ghostTrail && collision.checkTrail(leadX, leadY);

    if (hitWall) { this.alive = false; return; }
    if (hitTrail) {
      if (this.shielded) {
        this.effects.delete('shield');
        this.recalcEffects();
      } else {
        this.alive = false;
        return;
      }
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
        this.gapTimer  = 0;
        this.nextGapIn = randInt(
          Math.round(GAP_INTERVAL_MIN_S * this.tickRate),
          Math.round(GAP_INTERVAL_MAX_S * this.tickRate),
        );
      }
    } else {
      if (this.gapTimer >= this.nextGapIn) {
        this.gapActive   = true;
        this.gapTimer    = 0;
        this.gapDuration = randInt(
          Math.round(GAP_DURATION_MIN_S * this.tickRate),
          Math.round(GAP_DURATION_MAX_S * this.tickRate),
        );
      }
    }
  }
}
