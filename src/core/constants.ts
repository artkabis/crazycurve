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

// ── Server ─────────────────────────────────────────────────────
export const SERVER_TICK_RATE = 30; // Hz
export const SERVER_TICK_MS = 1000 / SERVER_TICK_RATE;
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 6;

// ── Players (up to 6 for multiplayer) ──────────────────────────
export const PLAYER_PALETTE = [
  { id: 1, name: 'P1', color: 0xff4466, colorHex: '#ff4466', leftKey: 'ArrowLeft', rightKey: 'ArrowRight' },
  { id: 2, name: 'P2', color: 0x44aaff, colorHex: '#44aaff', leftKey: 'a',         rightKey: 'd'           },
  { id: 3, name: 'P3', color: 0x44ff88, colorHex: '#44ff88', leftKey: '',          rightKey: ''            },
  { id: 4, name: 'P4', color: 0xffaa00, colorHex: '#ffaa00', leftKey: '',          rightKey: ''            },
  { id: 5, name: 'P5', color: 0xaa44ff, colorHex: '#aa44ff', leftKey: '',          rightKey: ''            },
  { id: 6, name: 'P6', color: 0x00ddff, colorHex: '#00ddff', leftKey: '',          rightKey: ''            },
] as const;

export type PlayerPalette = (typeof PLAYER_PALETTE)[number];

// Default 2-player local config
export const PLAYER_CONFIGS = PLAYER_PALETTE.slice(0, 2);
export type PlayerConfig = (typeof PLAYER_CONFIGS)[number];

export function getPalette(id: number): PlayerPalette {
  const p = PLAYER_PALETTE.find((c) => c.id === id);
  if (!p) throw new Error(`Unknown player id: ${id}`);
  return p;
}
