import type { Application } from 'pixi.js';
import type { GameEngine } from '../core/GameEngine.ts';
import type { GameRenderer } from '../renderer/GameRenderer.ts';
import type { TrailLayer } from '../renderer/TrailLayer.ts';
import type { InputManager } from '../input/InputManager.ts';
import type { InputState } from '../core/types.ts';

interface PlayerKeys { id: number; leftKey: string; rightKey: string; }

export class GameScene {
  private tickFn: (() => void) | null = null;

  constructor(
    private readonly app: Application,
    private readonly engine: GameEngine,
    private readonly input: InputManager,
    private readonly trailLayer: TrailLayer,
    private readonly renderer: GameRenderer,
    private readonly playerConfigs: readonly PlayerKeys[],
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
      this.playerConfigs.map((cfg) => [
        cfg.id,
        { left: this.input.isDown(cfg.leftKey), right: this.input.isDown(cfg.rightKey) },
      ]),
    );

    this.engine.update(inputs, performance.now());

    this.trailLayer.drawNewPoints(this.engine.curves);
    for (const curve of this.engine.curves) curve.newPoints = [];

    this.renderer.renderFrame(this.engine);
  }
}
