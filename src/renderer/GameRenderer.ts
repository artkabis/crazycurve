import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { Application } from 'pixi.js';
import { ARENA_WIDTH, ARENA_HEIGHT, PLAYER_PALETTE, POWERUP_CONFIGS, SCORE_TO_WIN } from '../core/constants.ts';
import type { IGameState, PowerUpType } from '../core/types.ts';
import type { TrailLayer } from './TrailLayer.ts';
import { PowerUpLayer } from './PowerUpLayer.ts';
import { buildBackground } from './Background.ts';

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  alpha: number;
  color: number;
  radius: number;
  decay: number;
}

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

  // Death particles
  private readonly particles: Particle[] = [];
  private readonly particleGraphics: Graphics;
  private readonly prevAlive = new Map<number, boolean>();

  // Name tags shown during countdown
  private readonly nameTags = new Map<number, Text>();

  // For destroy()
  private readonly ownedChildren: Container[] = [];
  private readonly trailSprite: Container;

  constructor(
    private readonly app: Application,
    trailLayer: TrailLayer,
    playerIds: readonly number[],
    private readonly scoreToWin: number = SCORE_TO_WIN,
  ) {
    this.trailSprite = trailLayer.sprite as unknown as Container;

    const bg = buildBackground();
    const headsLayer = new Container();
    const hudLayer = new Container();
    const overlayLayer = new Container();

    this.powerUpLayer = new PowerUpLayer();

    app.stage.addChild(bg);
    app.stage.addChild(trailLayer.sprite);
    app.stage.addChild(this.powerUpLayer.displayObject);
    app.stage.addChild(headsLayer);
    app.stage.addChild(hudLayer);
    app.stage.addChild(overlayLayer);

    this.ownedChildren.push(
      bg,
      this.powerUpLayer.displayObject as unknown as Container,
      headsLayer,
      hudLayer,
      overlayLayer,
    );

    // ── Particle canvas (drawn first so heads appear on top) ───
    this.particleGraphics = new Graphics();
    headsLayer.addChild(this.particleGraphics);

    // ── Curve head dots ────────────────────────────────────────
    for (const id of playerIds) {
      const g = new Graphics();
      headsLayer.addChild(g);
      this.headGraphics.set(id, g);
      this.prevAlive.set(id, true);
    }

    // ── Name tags (shown during countdown) ────────────────────
    for (const id of playerIds) {
      const palette = PLAYER_PALETTE.find((p) => p.id === id)!;
      const tag = new Text({
        text: palette.name,
        style: new TextStyle({
          fontFamily: 'Courier New',
          fontSize: 11,
          fontWeight: 'bold',
          fill: palette.color,
          dropShadow: { distance: 0, blur: 6, color: 0x000000, alpha: 0.9 },
        }),
      });
      tag.visible = false;
      headsLayer.addChild(tag);
      this.nameTags.set(id, tag);
    }

    // ── Score + effect HUD ─────────────────────────────────────
    playerIds.forEach((id, idx) => {
      const palette = PLAYER_PALETTE.find((p) => p.id === id)!;
      const baseX = 10 + idx * 140;

      const score = new Text({
        text: `${palette.name}: 0/${this.scoreToWin}`,
        style: new TextStyle({ fontFamily: 'Courier New', fontSize: 13, fill: palette.color }),
      });
      score.x = baseX;
      score.y = ARENA_HEIGHT - 20;
      hudLayer.addChild(score);
      this.scoreTexts.set(id, score);

      const effectContainer = new Container();
      effectContainer.x = baseX;
      effectContainer.y = ARENA_HEIGHT - 34;
      hudLayer.addChild(effectContainer);
      this.effectContainers.set(id, effectContainer);

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

  destroy(): void {
    this.app.stage.removeChild(this.trailSprite);
    for (const child of this.ownedChildren) {
      this.app.stage.removeChild(child);
      child.destroy({ children: true });
    }
    this.ownedChildren.length = 0;
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
    const showNames = state.phase === 'countdown';

    // Detect deaths → burst of particles
    for (const curve of state.curves) {
      const wasAlive = this.prevAlive.get(curve.id) ?? true;
      if (wasAlive && !curve.alive) this.spawnParticles(curve.x, curve.y, curve.id);
      this.prevAlive.set(curve.id, curve.alive);
    }

    // Draw + age particles
    this.tickParticles();

    for (const curve of state.curves) {
      const palette = PLAYER_PALETTE.find((p) => p.id === curve.id)!;
      const g = this.headGraphics.get(curve.id);
      if (!g) continue;
      g.clear();

      if (!curve.alive) continue;

      const alpha = curve.ghostTrail ? 0.35 : 1;

      // Outer coloured halo (identifies which player is which)
      g.circle(curve.x, curve.y, curve.trailRadius + 5)
        .fill({ color: palette.color, alpha: 0.3 * alpha });

      // White core dot
      g.circle(curve.x, curve.y, curve.trailRadius + 1.5)
        .fill({ color: 0xffffff, alpha });

      // Shield ring
      if (curve.activeEffects.includes('shield')) {
        const pulse = 0.6 + Math.sin(Date.now() / 150) * 0.4;
        g.circle(curve.x, curve.y, curve.trailRadius + 9)
          .stroke({ color: 0x00ffcc, width: 2, alpha: pulse });
      }

      // Direction arrow (countdown only) with arrowhead
      if (showArrow) {
        const len = 28;
        const ex = curve.x + Math.cos(curve.angle) * len;
        const ey = curve.y + Math.sin(curve.angle) * len;
        const hw = 8;
        const hs = 0.55;
        g.moveTo(curve.x, curve.y).lineTo(ex, ey)
          .stroke({ color: palette.color, width: 2, alpha: 0.85 });
        g.moveTo(ex, ey)
          .lineTo(
            ex + Math.cos(curve.angle + Math.PI + hs) * hw,
            ey + Math.sin(curve.angle + Math.PI + hs) * hw,
          )
          .stroke({ color: palette.color, width: 2, alpha: 0.85 });
        g.moveTo(ex, ey)
          .lineTo(
            ex + Math.cos(curve.angle + Math.PI - hs) * hw,
            ey + Math.sin(curve.angle + Math.PI - hs) * hw,
          )
          .stroke({ color: palette.color, width: 2, alpha: 0.85 });
      }

      // Name tag above head
      const tag = this.nameTags.get(curve.id);
      if (tag) {
        tag.visible = showNames;
        if (showNames) {
          tag.x = curve.x - tag.width / 2;
          tag.y = curve.y - curve.trailRadius - 18;
        }
      }
    }

    // Hide name tags for dead / non-countdown frames
    if (!showNames) {
      for (const tag of this.nameTags.values()) tag.visible = false;
    }
  }

  private spawnParticles(x: number, y: number, id: number): void {
    const palette = PLAYER_PALETTE.find((p) => p.id === id)!;
    for (let i = 0; i < 18; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.2 + Math.random() * 4;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        alpha: 1,
        color: palette.color,
        radius: 1.5 + Math.random() * 2.5,
        decay: 0.022 + Math.random() * 0.018,
      });
    }
  }

  private tickParticles(): void {
    this.particleGraphics.clear();
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.93;
      p.vy *= 0.93;
      p.alpha -= p.decay;
      if (p.alpha <= 0) { this.particles.splice(i, 1); continue; }
      this.particleGraphics.circle(p.x, p.y, p.radius).fill({ color: p.color, alpha: p.alpha });
    }
  }

  private syncHUD(state: IGameState): void {
    for (const [id, text] of this.scoreTexts) {
      const palette = PLAYER_PALETTE.find((p) => p.id === id)!;
      text.text = `${palette.name}: ${state.getScore(id)}/${this.scoreToWin}`;
    }
    this.roundLabel.text = `Round ${state.round}`;
  }

  private syncEffects(state: IGameState): void {
    for (const [id, container] of this.effectContainers) {
      const curve = state.curves.find((c) => c.id === id);
      const effectKey = curve ? [...curve.activeEffects].sort().join(',') : '';

      if (effectKey === this.prevEffectKeys.get(id)) continue;
      this.prevEffectKeys.set(id, effectKey);

      const sprites = this.effectSprites.get(id)!;

      for (const s of sprites.values()) s.visible = false;

      if (!curve || curve.activeEffects.length === 0) continue;

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
