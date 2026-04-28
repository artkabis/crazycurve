import {
  ARENA_WIDTH,
  ARENA_HEIGHT,
  POWERUP_CONFIGS,
  POWERUP_MAX_ACTIVE,
  POWERUP_RADIUS,
  POWERUP_SPAWN_INTERVAL_S,
  ERASER_RADIUS,
} from '../constants.ts';
import type { CollisionSystem } from './CollisionSystem.ts';
import type { Curve } from '../entities/Curve.ts';
import { Pickup } from '../entities/PowerUp.ts';
import type { PickupRenderData, PowerUpType } from '../types.ts';

export class PowerUpSystem {
  private pickups: Pickup[] = [];
  private spawnTimer = 0;

  constructor(
    private readonly onPickup?: (type: PowerUpType, collectorId: number) => void,
    private readonly onErase?: (x: number, y: number, radius: number) => void,
  ) {}

  reset(): void {
    this.pickups    = [];
    this.spawnTimer = 0;
  }

  update(curves: Curve[], collision: CollisionSystem, currentTick: number, tickRate: number): void {
    for (const c of curves) c.tickEffects(currentTick);

    this.spawnTimer++;
    const spawnInterval = Math.round(POWERUP_SPAWN_INTERVAL_S * tickRate);
    if (this.spawnTimer >= spawnInterval && this.pickups.length < POWERUP_MAX_ACTIVE) {
      this.spawnTimer = 0;
      this.trySpawn(collision);
    }

    for (const pickup of this.pickups) {
      if (pickup.collected) continue;
      for (const curve of curves) {
        if (!curve.alive) continue;
        const dx = curve.x - pickup.x;
        const dy = curve.y - pickup.y;
        if (dx * dx + dy * dy <= POWERUP_RADIUS * POWERUP_RADIUS) {
          pickup.collected = true;
          this.applyEffect(pickup.type, curve, curves, currentTick, tickRate, collision);
          this.onPickup?.(pickup.type, curve.id);
          break;
        }
      }
    }

    this.pickups = this.pickups.filter((p) => !p.collected);
  }

  getPickupsSnapshot(): PickupRenderData[] {
    return this.pickups.map((p) => ({ id: p.id, x: p.x, y: p.y, type: p.type }));
  }

  private trySpawn(collision: CollisionSystem): void {
    const margin = 60;
    for (let i = 0; i < 12; i++) {
      const x = margin + Math.random() * (ARENA_WIDTH  - margin * 2);
      const y = margin + Math.random() * (ARENA_HEIGHT - margin * 2);
      if (!collision.checkTrail(x, y) && !collision.checkWall(x, y)) {
        const cfg = POWERUP_CONFIGS[Math.floor(Math.random() * POWERUP_CONFIGS.length)];
        this.pickups.push(new Pickup(x, y, cfg.type));
        return;
      }
    }
  }

  private applyEffect(
    type: PowerUpType,
    collector: Curve,
    allCurves: Curve[],
    currentTick: number,
    tickRate: number,
    collision: CollisionSystem,
  ): void {
    const cfg = POWERUP_CONFIGS.find((c) => c.type === type)!;

    if (type === 'teleport') {
      const margin = 80;
      const x = margin + Math.random() * (ARENA_WIDTH  - margin * 2);
      const y = margin + Math.random() * (ARENA_HEIGHT - margin * 2);
      collector.teleport(x, y, Math.random() * Math.PI * 2);
      return;
    }

    if (type === 'eraser') {
      collision.erase(collector.x, collector.y, ERASER_RADIUS);
      this.onErase?.(collector.x, collector.y, ERASER_RADIUS);
      return;
    }

    const targets   = cfg.targetSelf
      ? [collector]
      : allCurves.filter((c) => c.id !== collector.id && c.alive);

    const expiresAt = currentTick + Math.round(cfg.duration * tickRate);
    for (const t of targets) t.applyEffect(type, expiresAt);
  }
}
