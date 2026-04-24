import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { Application } from 'pixi.js';
import { ARENA_WIDTH, ARENA_HEIGHT, PLAYER_PALETTE, POWERUP_CONFIGS } from '../core/constants.ts';
import type { IGameState, PowerUpType } from '../core/types.ts';
import type { TrailLayer } from './TrailLayer.ts';
import { PowerUpLayer } from './PowerUpLayer.ts';

export class GameRenderer {
  private readonly headGraphics = new Map<number, Graphics>();
  private readonly scoreTexts = new Map<number, Text>();
  private readonly dimOverlay: Graphics;
  private readonly centerText: Text;
  private readonly roundLabel: Text;
  private readonly powerUpLayer: PowerUpLayer;

  // Effect badges: pre-allocated one Text per (player, effect type)
  private readonly effectContainers = new Map<number, Container>();
  private readonly effectSprites = new Map<number, Map<PowerUpType, Text>>();
  private readonly prevEffectKeys = new Map<number, string>();

  constructor(
    app: Application,
    trailLayer: TrailLayer,
    playerIds: readonly number[],
  ) {
    const border = new Graphics();
    border.rect(1, 1, ARENA_WIDTH - 2, ARENA_HEIGHT - 2).stroke({ color: 0x222222, width: 2 });

    const headsLayer = new Container();
    const hudLayer = new Container();
    const overlayLayer = new Container();

    this.powerUpLayer = new PowerUpLayer();

    app.stage.addChild(border);
    app.stage.addChild(trailLayer.sprite);
    app.stage.addChild(this.powerUpLayer.displayObject);
    app.stage.addChild(headsLayer);
    app.stage.addChild(hudLayer);
    app.stage.addChild(overlayLayer);

    // ── Curve head dots ────────────────────────────────────────
    for (const id of playerIds) {
      const g = new Graphics();
      headsLayer.addChild(g);
      this.headGraphics.set(id, g);
    }

    // ── Score + effect HUD ─────────────────────────────────────
    playerIds.forEach((id, idx) => {
      const palette = PLAYER_PALETTE.find((p) => p.id === id)!;
      const baseX = 10 + idx * 140;

      // Score label
      const score = new Text({
        text: `${palette.name}: 0`,
        style: new TextStyle({ fontFamily: 'Courier New', fontSize: 13, fill: palette.color }),
      });
      score.x = baseX;
      score.y = ARENA_HEIGHT - 20;
      hudLayer.addChild(score);
      this.scoreTexts.set(id, score);

      // Effect badges container (above score)
      const effectContainer = new Container();
      effectContainer.x = baseX;
      effectContainer.y = ARENA_HEIGHT - 34;
      hudLayer.addChild(effectContainer);
      this.effectContainers.set(id, effectContainer);

      // Pre-allocate one Text per power-up type, hidden by default
      const sprites = new Map<PowerUpType, Text>();
      for (const cfg of POWERUP_CONFIGS) {
        const t = new Text({
          text: cfg.label,
          style: new TextStyle({
            fontFamily: 'Courier New',
            fontSize: 9,
            fontWeight: 'bold',
            fill: cfg.color,
          }),
        });
        t.visible = false;
        effectContainer.addChild(t);
        sprites.set(cfg.type, t);
      }
      this.effectSprites.set(id, sprites);
    });

    // ── Round label ────────────────────────────────────────────
    this.roundLabel = new Text({
      text: '',
      style: new TextStyle({ fontFamily: 'Courier New', fontSize: 13, fill: 0x555555 }),
    });
    this.roundLabel.anchor.set(1, 1);
    this.roundLabel.x = ARENA_WIDTH - 10;
    this.roundLabel.y = ARENA_HEIGHT - 6;
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

  renderFrame(state: IGameState): void {
    this.syncHeads(state);
    this.syncHUD(state);
    this.syncEffects(state);
    this.syncOverlay(state);
    this.powerUpLayer.update(state.pickups);
  }

  private syncHeads(state: IGameState): void {
    const showArrow = state.phase === 'countdown';

    for (const curve of state.curves) {
      const g = this.headGraphics.get(curve.id);
      if (!g) continue;
      g.clear();
      if (!curve.alive) continue;

      const alpha = curve.ghostTrail ? 0.35 : 1;
      g.circle(curve.x, curve.y, curve.trailRadius + 2).fill({ color: 0xffffff, alpha });

      if (curve.activeEffects.includes('shield')) {
        const pulse = 0.6 + Math.sin(Date.now() / 150) * 0.4;
        g.circle(curve.x, curve.y, curve.trailRadius + 7)
          .stroke({ color: 0x00ffcc, width: 2, alpha: pulse });
      }

      // Direction arrow shown during countdown
      if (showArrow) {
        const len = 22;
        const ax = curve.x + Math.cos(curve.angle) * len;
        const ay = curve.y + Math.sin(curve.angle) * len;
        g.moveTo(curve.x, curve.y)
          .lineTo(ax, ay)
          .stroke({ color: 0xffffff, width: 1.5, alpha: 0.55 });
      }
    }
  }

  private syncHUD(state: IGameState): void {
    for (const [id, text] of this.scoreTexts) {
      const palette = PLAYER_PALETTE.find((p) => p.id === id)!;
      text.text = `${palette.name}: ${state.getScore(id)}`;
    }
    this.roundLabel.text = `Round ${state.round}`;
  }

  private syncEffects(state: IGameState): void {
    for (const [id, container] of this.effectContainers) {
      const curve = state.curves.find((c) => c.id === id);
      const effectKey = curve ? [...curve.activeEffects].sort().join(',') : '';

      // Skip redraw if nothing changed
      if (effectKey === this.prevEffectKeys.get(id)) continue;
      this.prevEffectKeys.set(id, effectKey);

      const sprites = this.effectSprites.get(id)!;

      // Hide all first
      for (const s of sprites.values()) s.visible = false;

      if (!curve || curve.activeEffects.length === 0) continue;

      // Show active effects in config order, positioned left-to-right
      let xOffset = 0;
      for (const cfg of POWERUP_CONFIGS) {
        if (!curve.activeEffects.includes(cfg.type)) continue;
        const t = sprites.get(cfg.type)!;
        t.visible = true;
        t.x = xOffset;
        xOffset += t.width + 4;
      }

      container.visible = xOffset > 0;
    }
  }

  private syncOverlay(state: IGameState): void {
    const { phase } = state;

    if (phase === 'countdown') {
      this.setOverlayVisible(true);
      this.centerText.text = String(Math.max(1, state.countdown));
      this.centerText.style.fontSize = 96;
      this.centerText.style.fill = 0xffffff;
      return;
    }

    if (phase === 'round_over') {
      this.setOverlayVisible(true);
      const winner = state.curves.find((c) => c.alive);
      const palette = PLAYER_PALETTE.find((p) => p.id === winner?.id);
      this.centerText.style.fontSize = 40;
      if (palette) {
        this.centerText.text = `${palette.name} wins the round!`;
        this.centerText.style.fill = palette.color;
      } else {
        this.centerText.text = 'Draw!';
        this.centerText.style.fill = 0xffffff;
      }
      return;
    }

    this.setOverlayVisible(false);
  }

  private setOverlayVisible(v: boolean): void {
    this.dimOverlay.visible = v;
    this.centerText.visible = v;
  }
}
