// ── Arena ──────────────────────────────────────────────────────
export const ARENA_WIDTH = 800;
export const ARENA_HEIGHT = 600;

// ── Physics ────────────────────────────────────────────────────
export const PLAYER_SPEED = 2.5; // px per frame @ 60 fps
export const TURN_RATE = 0.042; // radians per frame (~2.4°)
export const TRAIL_RADIUS = 2.5; // px

// ── Gap mechanic ───────────────────────────────────────────────
export const GAP_INTERVAL_MIN = 200; // frames between gaps
export const GAP_INTERVAL_MAX = 380;
export const GAP_DURATION_MIN = 14; // frames gap stays open
export const GAP_DURATION_MAX = 24;
export const STARTUP_GAP_FRAMES = 80; // initial no-trail grace period

// ── Game rules ─────────────────────────────────────────────────
export const ROUNDS_TO_WIN = 5;
export const ROUND_OVER_DELAY_MS = 2500;
export const COUNTDOWN_SECONDS = 3;

// ── Players ────────────────────────────────────────────────────
export const PLAYER_CONFIGS = [
  {
    id: 1,
    name: 'P1',
    color: 0xff4466,
    colorHex: '#ff4466',
    leftKey: 'ArrowLeft',
    rightKey: 'ArrowRight',
  },
  {
    id: 2,
    name: 'P2',
    color: 0x44aaff,
    colorHex: '#44aaff',
    leftKey: 'a',
    rightKey: 'd',
  },
] as const;

export type PlayerConfig = (typeof PLAYER_CONFIGS)[number];
