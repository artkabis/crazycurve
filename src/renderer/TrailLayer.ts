import { Container, Graphics, RenderTexture, Sprite } from 'pixi.js';
import type { Application } from 'pixi.js';
import { ARENA_WIDTH, ARENA_HEIGHT, PLAYER_CONFIGS } from '../core/constants.ts';
import type { Curve } from '../core/entities/Curve.ts';

/**
 * Renders curve trails incrementally into a RenderTexture.
 * Only new points are drawn each frame — no full redraw needed.
 * This is the performance backbone for trail rendering at scale.
 */
export class TrailLayer {
  private readonly renderTexture: RenderTexture;
  private readonly brush: Graphics;
  private readonly brushContainer: Container;

  readonly sprite: Sprite;

  constructor(private readonly app: Application) {
    this.renderTexture = RenderTexture.create({ width: ARENA_WIDTH, height: ARENA_HEIGHT });
    this.sprite = new Sprite(this.renderTexture);

    this.brush = new Graphics();
    this.brushContainer = new Container();
    this.brushContainer.addChild(this.brush);
  }

  clear(): void {
    this.app.renderer.render({
      container: new Container(),
      target: this.renderTexture,
      clear: true,
    });
  }

  drawNewPoints(curves: readonly Curve[]): void {
    for (const curve of curves) {
      if (curve.newPoints.length === 0) continue;

      const cfg = PLAYER_CONFIGS.find((p) => p.id === curve.id);
      if (!cfg) continue;

      this.brush.clear();
      for (const pt of curve.newPoints) {
        this.brush.circle(pt.x, pt.y, curve.trailRadius).fill({ color: cfg.color });
      }

      this.app.renderer.render({
        container: this.brushContainer,
        target: this.renderTexture,
        clear: false,
      });
    }
  }
}
