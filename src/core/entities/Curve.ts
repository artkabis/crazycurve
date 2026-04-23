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
import type { InputState, Vec2 } from '../types.ts';
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

  private gapActive = true;
  private gapTimer = 0;
  private gapDuration = STARTUP_GAP_FRAMES;
  private nextGapIn = 0;

  /** New solid points added this tick — consumed by the renderer. */
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

  update(input: InputState, collision: CollisionSystem): void {
    if (!this.alive) return;

    this.newPoints = [];

    if (input.left) this.angle -= this.turnRate;
    if (input.right) this.angle += this.turnRate;

    const nx = this.x + Math.cos(this.angle) * this.speed;
    const ny = this.y + Math.sin(this.angle) * this.speed;

    // Check collision at new position before painting
    const hitWall = collision.checkWall(nx, ny);
    const hitTrail = !this.gapActive && collision.checkTrail(nx, ny);

    if (hitWall || hitTrail) {
      this.alive = false;
      return;
    }

    this.x = nx;
    this.y = ny;

    if (!this.gapActive) {
      collision.paint(this.x, this.y, this.id);
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
