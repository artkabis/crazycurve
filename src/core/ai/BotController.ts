import type { CollisionSystem } from '../systems/CollisionSystem.ts';
import type { Curve } from '../entities/Curve.ts';
import type { InputState, PickupRenderData } from '../types.ts';

export type BotDifficulty = 'easy' | 'medium' | 'hard';

const SCAN_STEPS: Record<BotDifficulty, number> = { easy: 12, medium: 30, hard: 60 };
const NOISE: Record<BotDifficulty, number>      = { easy: 0.25, medium: 0.08, hard: 0 };

export class BotController {
  readonly curveId: number;
  private readonly scanSteps: number;
  private readonly noise: number;

  constructor(curveId: number, private readonly difficulty: BotDifficulty = 'medium') {
    this.curveId   = curveId;
    this.scanSteps = SCAN_STEPS[difficulty];
    this.noise     = NOISE[difficulty];
  }

  computeInput(
    curve: Curve,
    collision: CollisionSystem,
    pickups: readonly PickupRenderData[],
  ): InputState {
    if (!curve.alive || curve.frozen) return { left: false, right: false };

    if (Math.random() < this.noise) {
      const r = Math.random();
      return { left: r < 0.33, right: r > 0.66 };
    }

    const { speed, trailRadius: r, angle, turnRate } = curve;

    const straight  = this.scan(curve.x, curve.y, angle,                speed, r, collision);
    const leftFree  = this.scan(curve.x, curve.y, angle - turnRate * 3, speed, r, collision);
    const rightFree = this.scan(curve.x, curve.y, angle + turnRate * 3, speed, r, collision);

    if (this.difficulty === 'hard' && straight > 20 && pickups.length > 0) {
      const nearest = pickups.reduce((a, b) => {
        const da = (curve.x - a.x) ** 2 + (curve.y - a.y) ** 2;
        const db = (curve.x - b.x) ** 2 + (curve.y - b.y) ** 2;
        return da < db ? a : b;
      });
      const diff = this.wrapAngle(
        Math.atan2(nearest.y - curve.y, nearest.x - curve.x) - angle,
      );
      if (Math.abs(diff) < Math.PI / 2) return { left: diff < 0, right: diff > 0 };
    }

    const best = Math.max(straight, leftFree, rightFree);
    if (best === straight && straight > 4) return { left: false, right: false };
    if (leftFree >= rightFree)             return { left: true,  right: false };
    return                                        { left: false, right: true  };
  }

  private scan(
    sx: number, sy: number, angle: number,
    speed: number, r: number, collision: CollisionSystem,
  ): number {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    let x = sx, y = sy;
    for (let i = 0; i < this.scanSteps; i++) {
      x += cos * speed;
      y += sin * speed;
      if (
        collision.checkWall(x, y, r) ||
        collision.checkTrail(x + cos * r, y + sin * r)
      ) return i;
    }
    return this.scanSteps;
  }

  private wrapAngle(a: number): number {
    while (a >  Math.PI) a -= 2 * Math.PI;
    while (a < -Math.PI) a += 2 * Math.PI;
    return a;
  }
}
