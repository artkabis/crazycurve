import type { Application } from 'pixi.js';
import { PLAYER_CONFIGS } from '../core/constants.ts';
import type { GameEngine } from '../core/GameEngine.ts';
import type { GameRenderer } from '../renderer/GameRenderer.ts';
import type { TrailLayer } from '../renderer/TrailLayer.ts';
import type { InputManager } from '../input/InputManager.ts';
import type { InputState } from '../core/types.ts';

export class GameScene {
  private tickFn: (() => void) | null = null;

  constructor(
    private readonly app: Application,
    private readonly engine: GameEngine,
    private readonly input: InputManager,
    private readonly trailLayer: TrailLayer,
    private readonly renderer: GameRenderer,
  ) {}

  start(): void {
    this.engine.startGame();
    this.tickFn = () => this.tick();
    this.app.ticker.add(this.tickFn);
  }

  stop(): void {
    if (this.tickFn) {
      this.app.ticker.remove(this.tickFn);
      this.tickFn = null;
    }
  }

  private tick(): void {
    const inputs = new Map<number, InputState>(
      PLAYER_CONFIGS.map((cfg) => [
        cfg.id,
        { left: this.input.isDown(cfg.leftKey), right: this.input.isDown(cfg.rightKey) },
      ]),
    );

    this.engine.update(inputs, performance.now());
    this.trailLayer.drawNewPoints(this.engine.curves);
    this.renderer.renderFrame();
  }
}
