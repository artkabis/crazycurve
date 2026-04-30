import { Missile } from '../entities/Missile.ts';
import type { CollisionSystem } from './CollisionSystem.ts';
import type { Curve } from '../entities/Curve.ts';
import { PLAYER_SPEED_PPS } from '../constants.ts';
import type { MissileRenderData } from '../types.ts';

const MISSILE_SPEED_MULT = 3.5;
const ERASE_RADIUS       = 10;

export class MissileSystem {
  private missiles: Missile[] = [];

  reset(): void { this.missiles = []; }

  fire(curve: Curve, tickRate: number): void {
    const speed = (PLAYER_SPEED_PPS / tickRate) * MISSILE_SPEED_MULT;
    this.missiles.push(new Missile(curve.x, curve.y, curve.angle, curve.id, speed));
  }

  update(
    curves: Curve[],
    collision: CollisionSystem,
    onHit: (ownerId: number, targetId: number | null, x: number, y: number) => void,
  ): void {
    for (const m of this.missiles) {
      if (!m.alive) continue;
      m.update();

      for (const c of curves) {
        if (!c.alive || c.id === m.ownerId) continue;
        const dx = c.x - m.x, dy = c.y - m.y;
        if (dx * dx + dy * dy < (c.trailRadius + 5) ** 2) {
          m.alive = false;
          c.alive = false;
          onHit(m.ownerId, c.id, m.x, m.y);
          break;
        }
      }

      if (!m.alive) continue;

      if (collision.checkTrail(m.x, m.y)) {
        collision.erase(m.x, m.y, ERASE_RADIUS);
        m.alive = false;
        onHit(m.ownerId, null, m.x, m.y);
      }
    }

    this.missiles = this.missiles.filter((m) => m.alive);
  }

  getSnapshot(): MissileRenderData[] {
    return this.missiles.map((m) => ({
      id: m.id, x: m.x, y: m.y, angle: m.angle, ownerId: m.ownerId,
    }));
  }
}
