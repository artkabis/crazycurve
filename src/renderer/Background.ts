import { Container, Graphics } from 'pixi.js';
import { ARENA_WIDTH, ARENA_HEIGHT } from '../core/constants.ts';

export interface RoundTheme {
  name: string;
  bg: number;
  primary: number;
  grid: number;
  glow: number;
}

export const ROUND_THEMES: readonly RoundTheme[] = [
  { name: 'ELECTRIC', bg: 0x07070e, primary: 0x3344cc, grid: 0x6666bb, glow: 0x4466ff },
  { name: 'INFERNO',  bg: 0x0e0704, primary: 0xcc3311, grid: 0xbb5544, glow: 0xff5533 },
  { name: 'MATRIX',   bg: 0x040e07, primary: 0x117733, grid: 0x44bb66, glow: 0x00ff55 },
  { name: 'COSMIC',   bg: 0x080410, primary: 0x7711bb, grid: 0x886699, glow: 0xbb55ff },
  { name: 'SOLAR',    bg: 0x0e0900, primary: 0xaa7700, grid: 0xbbaa44, glow: 0xffaa00 },
  { name: 'ARCTIC',   bg: 0x04090e, primary: 0x117799, grid: 0x44aacc, glow: 0x00ddff },
];

export function getTheme(round: number): RoundTheme {
  return ROUND_THEMES[Math.max(0, (round - 1)) % ROUND_THEMES.length];
}

export class Background {
  private readonly container: Container;
  private readonly g: Graphics;
  private currentRound = -1;

  constructor() {
    this.container = new Container();
    this.g = new Graphics();
    this.container.addChild(this.g);
    this.rebuild(1);
  }

  get displayObject(): Container { return this.container; }

  update(round: number): void {
    if (round === this.currentRound) return;
    this.currentRound = round;
    this.rebuild(round);
  }

  private rebuild(round: number): void {
    const t = getTheme(round);
    const w = ARENA_WIDTH;
    const h = ARENA_HEIGHT;
    this.g.clear();

    // Dark tinted base
    this.g.rect(0, 0, w, h).fill({ color: t.bg });

    // Subtle grid in theme colour
    const GS = 60;
    for (let x = GS; x < w; x += GS) {
      this.g.moveTo(x, 0).lineTo(x, h).stroke({ color: t.grid, alpha: 0.055, width: 1 });
    }
    for (let y = GS; y < h; y += GS) {
      this.g.moveTo(0, y).lineTo(w, y).stroke({ color: t.grid, alpha: 0.055, width: 1 });
    }

    // Corner L-shaped accents
    const cl = 28, ca = 0.5;
    this.g.moveTo(0, cl).lineTo(0, 0).lineTo(cl, 0).stroke({ color: t.glow, width: 2, alpha: ca });
    this.g.moveTo(w - cl, 0).lineTo(w, 0).lineTo(w, cl).stroke({ color: t.glow, width: 2, alpha: ca });
    this.g.moveTo(0, h - cl).lineTo(0, h).lineTo(cl, h).stroke({ color: t.glow, width: 2, alpha: ca });
    this.g.moveTo(w - cl, h).lineTo(w, h).lineTo(w, h - cl).stroke({ color: t.glow, width: 2, alpha: ca });

    // Radial centre glow
    const cx = w / 2, cy = h / 2;
    this.g.ellipse(cx, cy, w * 0.5, h * 0.5).fill({ color: t.primary, alpha: 0.045 });
    this.g.ellipse(cx, cy, w * 0.28, h * 0.28).fill({ color: t.primary, alpha: 0.03 });

    // Edge vignette
    const vw = 48;
    this.g.rect(0, 0, vw, h).fill({ color: 0x000000, alpha: 0.25 });
    this.g.rect(w - vw, 0, vw, h).fill({ color: 0x000000, alpha: 0.25 });
    this.g.rect(0, 0, w, vw).fill({ color: 0x000000, alpha: 0.25 });
    this.g.rect(0, h - vw, w, vw).fill({ color: 0x000000, alpha: 0.25 });

    // Border glow (outer soft)
    this.g.rect(0, 0, w, h).stroke({ color: t.glow, width: 14, alpha: 0.12 });
    // Border sharp (inner)
    this.g.rect(1, 1, w - 2, h - 2).stroke({ color: t.primary, width: 2, alpha: 0.65 });
  }
}
