import { Application } from 'pixi.js';
import { ARENA_WIDTH, ARENA_HEIGHT, PLAYER_CONFIGS } from './core/constants.ts';
import { GameEngine } from './core/GameEngine.ts';
import { TrailLayer } from './renderer/TrailLayer.ts';
import { GameRenderer } from './renderer/GameRenderer.ts';
import { InputManager } from './input/InputManager.ts';
import { GameScene } from './scenes/GameScene.ts';
import { MenuScene } from './scenes/MenuScene.ts';
import { GameOverScene } from './scenes/GameOverScene.ts';

export class App {
  private pixiApp!: Application;
  private engine!: GameEngine;
  private input!: InputManager;
  private trailLayer!: TrailLayer;
  private gameRenderer!: GameRenderer;
  private gameScene!: GameScene;
  private activeOverlay?: { unmount(): void };

  async init(container: HTMLElement): Promise<void> {
    // ── PixiJS ─────────────────────────────────────────────────
    this.pixiApp = new Application();
    await this.pixiApp.init({
      width: ARENA_WIDTH,
      height: ARENA_HEIGHT,
      backgroundColor: 0x0a0a0f,
      antialias: false,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    // Insert canvas before the #ui overlay
    container.prepend(this.pixiApp.canvas);

    // ── Systems ────────────────────────────────────────────────
    this.input = new InputManager();
    this.engine = new GameEngine();
    this.trailLayer = new TrailLayer(this.pixiApp);
    this.gameRenderer = new GameRenderer(this.pixiApp, this.engine, this.trailLayer);
    this.gameScene = new GameScene(
      this.pixiApp,
      this.engine,
      this.input,
      this.trailLayer,
      this.gameRenderer,
    );

    // ── Event wiring ───────────────────────────────────────────
    // Clear trails at every new round start
    this.engine.on('phaseChange', (phase) => {
      if (phase === 'countdown') this.trailLayer.clear();
    });

    this.engine.on('gameOver', (winnerId) => {
      this.gameScene.stop();
      const scene = new GameOverScene(winnerId, this.engine.scores.getScores(), () => {
        scene.unmount();
        this.showMenu();
      });
      this.showOverlay(scene);
    });

    this.showMenu();
  }

  private showMenu(): void {
    const scene = new MenuScene(() => {
      scene.unmount();
      this.activeOverlay = undefined;
      this.gameScene.start();
    });
    this.showOverlay(scene);
  }

  private showOverlay(scene: { mount(el: HTMLElement): void; unmount(): void }): void {
    this.activeOverlay?.unmount();
    this.activeOverlay = scene;
    const ui = document.getElementById('ui');
    if (ui) scene.mount(ui);
  }
}
