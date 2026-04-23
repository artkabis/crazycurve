import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { Application } from 'pixi.js';
import { ARENA_WIDTH, ARENA_HEIGHT, PLAYER_CONFIGS } from '../core/constants.ts';
import type { GameEngine } from '../core/GameEngine.ts';
import type { TrailLayer } from './TrailLayer.ts';

/**
 * Owns the PixiJS scene graph.
 * Called once per animation frame to sync visual state with GameEngine.
 */
export class GameRenderer {
  private readonly headGraphics = new Map<number, Graphics>();
  private readonly scoreTexts = new Map<number, Text>();
  private readonly dimOverlay: Graphics;
  private readonly centerText: Text;
  private readonly roundLabel: Text;

  constructor(
    private readonly app: Application,
    private readonly engine: GameEngine,
    trailLayer: TrailLayer,
  ) {
    // ── Scene graph ────────────────────────────────────────────
    const border = new Graphics();
    border.rect(1, 1, ARENA_WIDTH - 2, ARENA_HEIGHT - 2).stroke({ color: 0x222222, width: 2 });

    const headsLayer = new Container();
    const hudLayer = new Container();
    const overlayLayer = new Container();

    app.stage.addChild(border);
    app.stage.addChild(trailLayer.sprite);
    app.stage.addChild(headsLayer);
    app.stage.addChild(hudLayer);
    app.stage.addChild(overlayLayer);

    // ── Curve head dots ────────────────────────────────────────
    for (const cfg of PLAYER_CONFIGS) {
      const g = new Graphics();
      headsLayer.addChild(g);
      this.headGraphics.set(cfg.id, g);
    }

    // ── Score HUD ──────────────────────────────────────────────
    for (const cfg of PLAYER_CONFIGS) {
      const t = new Text({
        text: `${cfg.name}: 0`,
        style: new TextStyle({ fontFamily: 'Courier New', fontSize: 13, fill: cfg.color }),
      });
      t.x = 10 + (cfg.id - 1) * 130;
      t.y = ARENA_HEIGHT - 22;
      hudLayer.addChild(t);
      this.scoreTexts.set(cfg.id, t);
    }

    this.roundLabel = new Text({
      text: '',
      style: new TextStyle({ fontFamily: 'Courier New', fontSize: 13, fill: 0x555555 }),
    });
    this.roundLabel.anchor.set(1, 1);
    this.roundLabel.x = ARENA_WIDTH - 10;
    this.roundLabel.y = ARENA_HEIGHT - 8;
    hudLayer.addChild(this.roundLabel);

    // ── Phase overlay ──────────────────────────────────────────
    this.dimOverlay = new Graphics();
    this.dimOverlay.rect(0, 0, ARENA_WIDTH, ARENA_HEIGHT).fill({ color: 0x000000, alpha: 0.55 });

    this.centerText = new Text({
      text: '',
      style: new TextStyle({
        fontFamily: 'Courier New',
        fontSize: 96,
        fontWeight: 'bold',
        fill: 0xffffff,
        align: 'center',
        dropShadow: { distance: 0, blur: 20, color: 0xffffff, alpha: 0.4 },
      }),
    });
    this.centerText.anchor.set(0.5, 0.5);
    this.centerText.x = ARENA_WIDTH / 2;
    this.centerText.y = ARENA_HEIGHT / 2;

    overlayLayer.addChild(this.dimOverlay);
    overlayLayer.addChild(this.centerText);

    this.setOverlayVisible(false);
  }

  renderFrame(): void {
    this.syncHeads();
    this.syncHUD();
    this.syncOverlay();
  }

  private syncHeads(): void {
    for (const curve of this.engine.curves) {
      const g = this.headGraphics.get(curve.id)!;
      g.clear();
      if (!curve.alive) continue;
      g.circle(curve.x, curve.y, curve.trailRadius + 2).fill({ color: 0xffffff });
    }
  }

  private syncHUD(): void {
    for (const cfg of PLAYER_CONFIGS) {
      this.scoreTexts.get(cfg.id)!.text = `${cfg.name}: ${this.engine.scores.getScore(cfg.id)}`;
    }
    this.roundLabel.text = `Round ${this.engine.round}`;
  }

  private syncOverlay(): void {
    const { phase } = this.engine;

    if (phase === 'countdown') {
      this.setOverlayVisible(true);
      this.centerText.text = String(Math.max(1, this.engine.countdown));
      this.centerText.style.fontSize = 96;
      this.centerText.style.fill = 0xffffff;
      return;
    }

    if (phase === 'round_over') {
      this.setOverlayVisible(true);
      const winner = this.engine.curves.find((c) => c.alive);
      const cfg = PLAYER_CONFIGS.find((p) => p.id === winner?.id);
      this.centerText.style.fontSize = 40;
      if (cfg) {
        this.centerText.text = `${cfg.name} wins the round!`;
        this.centerText.style.fill = cfg.color;
      } else {
        this.centerText.text = 'Draw!';
        this.centerText.style.fill = 0xffffff;
      }
      return;
    }

    this.setOverlayVisible(false);
  }

  private setOverlayVisible(visible: boolean): void {
    this.dimOverlay.visible = visible;
    this.centerText.visible = visible;
  }
}
