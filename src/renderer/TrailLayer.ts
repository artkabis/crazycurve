import { Container, Graphics, RenderTexture, Sprite } from 'pixi.js';
import type { Application } from 'pixi.js';
import { ARENA_WIDTH, ARENA_HEIGHT, getPalette } from '../core/constants.ts';
import type { CurveRenderData } from '../core/types.ts';

/**
 * Renders curve trails incrementally into a RenderTexture.
 * Only new points are painted each frame — O(new_points), not O(total_trail).
 * Works with both local Curve objects and network ShadowCurve objects via CurveRenderData.
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

  erase(x: number, y: number, radius: number): void {
    this.brush.clear();
    // blendMode 'erase' cuts pixels to transparent on the RenderTexture
    (this.brush as unknown as { blendMode: string }).blendMode = 'erase';
    this.brush.circle(x, y, radius).fill({ color: 0xffffff, alpha: 1 });
    this.app.renderer.render({
      container: this.brushContainer,
      target: this.renderTexture,
      clear: false,
    });
    (this.brush as unknown as { blendMode: string }).blendMode = 'normal';
    this.brush.clear();
  }

  drawNewPoints(curves: readonly CurveRenderData[]): void {
    let anyNew = false;

    this.brush.clear();

    for (const curve of curves) {
      if (curve.newPoints.length === 0) continue;
      anyNew = true;

      const palette = getPalette(curve.id);

      // Soft glow halo (two layers, low alpha)
      for (const pt of curve.newPoints) {
        this.brush.circle(pt.x, pt.y, curve.trailRadius * 3.5)
          .fill({ color: palette.color, alpha: 0.055 });
        this.brush.circle(pt.x, pt.y, curve.trailRadius * 2.0)
          .fill({ color: palette.color, alpha: 0.11 });
      }
      // Solid core
      for (const pt of curve.newPoints) {
        this.brush.circle(pt.x, pt.y, curve.trailRadius).fill({ color: palette.color });
      }
    }

    if (!anyNew) return;

    this.app.renderer.render({
      container: this.brushContainer,
      target: this.renderTexture,
      clear: false,
    });
  }
}
