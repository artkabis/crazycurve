import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { POWERUP_CONFIGS } from '../core/constants.ts';
import type { PickupRenderData } from '../core/types.ts';

export class PowerUpLayer {
  private readonly container = new Container();
  private readonly sprites = new Map<number, { g: Graphics; t: Text }>();

  get displayObject(): Container {
    return this.container;
  }

  update(pickups: readonly PickupRenderData[]): void {
    const activeIds = new Set(pickups.map((p) => p.id));
    const pulse = 0.85 + Math.sin(Date.now() / 280) * 0.15;

    for (const [id, { g, t }] of this.sprites) {
      if (!activeIds.has(id)) {
        g.destroy();
        t.destroy();
        this.sprites.delete(id);
      }
    }

    for (const pickup of pickups) {
      if (!this.sprites.has(pickup.id)) {
        const cfg = POWERUP_CONFIGS.find((c) => c.type === pickup.type)!;
        const g = new Graphics();
        const t = new Text({
          text: cfg.label,
          style: new TextStyle({
            fontFamily: 'Courier New',
            fontSize: 8,
            fontWeight: 'bold',
            fill: 0xffffff,
          }),
        });
        t.anchor.set(0.5, 0.5);
        this.container.addChild(g);
        this.container.addChild(t);
        this.sprites.set(pickup.id, { g, t });
      }

      const { g, t } = this.sprites.get(pickup.id)!;
      const cfg = POWERUP_CONFIGS.find((c) => c.type === pickup.type)!;
      const r = 12 * pulse;

      g.clear();
      g.circle(pickup.x, pickup.y, r + 3).fill({ color: cfg.color, alpha: 0.18 });
      g.circle(pickup.x, pickup.y, r).fill({ color: cfg.color, alpha: 0.75 });

      t.x = pickup.x;
      t.y = pickup.y;
    }
  }

  clear(): void {
    for (const { g, t } of this.sprites.values()) {
      g.destroy();
      t.destroy();
    }
    this.sprites.clear();
  }
}
