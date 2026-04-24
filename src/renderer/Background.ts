import { Container, Graphics } from 'pixi.js';
import { ARENA_WIDTH, ARENA_HEIGHT } from '../core/constants.ts';

const GRID_STEP   = 80;
const GRID_COLOR  = 0x6666bb;
const BORDER_COLOR = 0x3344cc;

/** Static decorative background: dark fill, faint grid, glowing border, centre glow. */
export function buildBackground(): Container {
  const c = new Container();
  const g = new Graphics();

  // ── Dark base ──────────────────────────────────────────────
  g.rect(0, 0, ARENA_WIDTH, ARENA_HEIGHT).fill({ color: 0x07070e });

  // ── Subtle grid ────────────────────────────────────────────
  for (let x = GRID_STEP; x < ARENA_WIDTH; x += GRID_STEP) {
    g.moveTo(x, 0).lineTo(x, ARENA_HEIGHT)
      .stroke({ color: GRID_COLOR, alpha: 0.055, width: 1 });
  }
  for (let y = GRID_STEP; y < ARENA_HEIGHT; y += GRID_STEP) {
    g.moveTo(0, y).lineTo(ARENA_WIDTH, y)
      .stroke({ color: GRID_COLOR, alpha: 0.055, width: 1 });
  }

  // ── Radial centre glow (3 nested ellipses, very faint) ────
  const cx = ARENA_WIDTH / 2;
  const cy = ARENA_HEIGHT / 2;
  g.ellipse(cx, cy, ARENA_WIDTH * 0.55, ARENA_HEIGHT * 0.55)
    .fill({ color: 0x1a1a44, alpha: 0.09 });
  g.ellipse(cx, cy, ARENA_WIDTH * 0.35, ARENA_HEIGHT * 0.35)
    .fill({ color: 0x1a1a44, alpha: 0.07 });
  g.ellipse(cx, cy, ARENA_WIDTH * 0.18, ARENA_HEIGHT * 0.18)
    .fill({ color: 0x1a1a44, alpha: 0.05 });

  // ── Edge vignette (4 thin dark bands) ─────────────────────
  const vw = 40;
  g.rect(0, 0, vw, ARENA_HEIGHT).fill({ color: 0x000000, alpha: 0.28 });
  g.rect(ARENA_WIDTH - vw, 0, vw, ARENA_HEIGHT).fill({ color: 0x000000, alpha: 0.28 });
  g.rect(0, 0, ARENA_WIDTH, vw).fill({ color: 0x000000, alpha: 0.28 });
  g.rect(0, ARENA_HEIGHT - vw, ARENA_WIDTH, vw).fill({ color: 0x000000, alpha: 0.28 });

  // ── Border glow (outer soft) ──────────────────────────────
  g.rect(0, 0, ARENA_WIDTH, ARENA_HEIGHT)
    .stroke({ color: BORDER_COLOR, width: 10, alpha: 0.15 });
  // ── Border sharp (inner) ─────────────────────────────────
  g.rect(1, 1, ARENA_WIDTH - 2, ARENA_HEIGHT - 2)
    .stroke({ color: BORDER_COLOR, width: 2, alpha: 0.6 });

  c.addChild(g);
  return c;
}
