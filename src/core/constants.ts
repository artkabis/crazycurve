import type { PowerUpType } from './types.ts';

// ── Arena ──────────────────────────────────────────────────────
export const ARENA_WIDTH = 800;
export const ARENA_HEIGHT = 600;

// ── Physics ────────────────────────────────────────────────────
export const PLAYER_SPEED = 2.5;
export const TURN_RATE = 0.042;
export const TRAIL_RADIUS = 2.5;

// ── Gap mechanic ───────────────────────────────────────────────
export const GAP_INTERVAL_MIN = 200;
export const GAP_INTERVAL_MAX = 380;
export const GAP_DURATION_MIN = 14;
export const GAP_DURATION_MAX = 24;
export const STARTUP_GAP_FRAMES = 80;

// ── Game rules ─────────────────────────────────────────────────
export const ROUNDS_TO_WIN = 5;
export const ROUND_OVER_DELAY_MS = 2500;
export const COUNTDOWN_SECONDS = 3;

// ── Server ─────────────────────────────────────────────────────
export const SERVER_TICK_RATE = 30;
export const SERVER_TICK_MS = 1000 / SERVER_TICK_RATE;
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 6;

// ── Power-ups ──────────────────────────────────────────────────
export interface PowerUpConfig {
  type: PowerUpType;
  color: number;
  label: string;
  duration: number; // ticks at 30 Hz; 0 = instant
  targetSelf: boolean;
}

export const POWERUP_CONFIGS: PowerUpConfig[] = [
  { type: 'speed_boost', color: 0xffdd00, label: 'FAST',   duration: 150, targetSelf: true  },
  { type: 'slow',        color: 0x4488ff, label: 'SLOW',   duration: 150, targetSelf: false },
  { type: 'reverse',     color: 0xff4488, label: 'REV',    duration: 120, targetSelf: false },
  { type: 'freeze',      color: 0x88ddff, label: 'FREEZE', duration:  90, targetSelf: false },
  { type: 'ghost',       color: 0xcccccc, label: 'GHOST',  duration: 120, targetSelf: true  },
  { type: 'thin',        color: 0x44ff88, label: 'THIN',   duration: 180, targetSelf: true  },
  { type: 'thick',       color: 0xff6600, label: 'THICK',  duration: 120, targetSelf: false },
  { type: 'teleport',    color: 0xff00ff, label: 'WARP',   duration:   0, targetSelf: true  },
];

export const POWERUP_SPAWN_INTERVAL = 180; // ticks between spawns (~6 s at 30 Hz)
export const POWERUP_MAX_ACTIVE = 5;
export const POWERUP_RADIUS = 12; // px — collection + visual radius

// ── Players ────────────────────────────────────────────────────
export const PLAYER_PALETTE = [
  { id: 1, name: 'P1', color: 0xff4466, colorHex: '#ff4466', leftKey: 'ArrowLeft', rightKey: 'ArrowRight' },
  { id: 2, name: 'P2', color: 0x44aaff, colorHex: '#44aaff', leftKey: 'a',         rightKey: 'd'           },
  { id: 3, name: 'P3', color: 0x44ff88, colorHex: '#44ff88', leftKey: '',           rightKey: ''            },
  { id: 4, name: 'P4', color: 0xffaa00, colorHex: '#ffaa00', leftKey: '',           rightKey: ''            },
  { id: 5, name: 'P5', color: 0xaa44ff, colorHex: '#aa44ff', leftKey: '',           rightKey: ''            },
  { id: 6, name: 'P6', color: 0x00ddff, colorHex: '#00ddff', leftKey: '',           rightKey: ''            },
] as const;

export type PlayerPalette = (typeof PLAYER_PALETTE)[number];

export const PLAYER_CONFIGS = PLAYER_PALETTE.slice(0, 2);
export type PlayerConfig = (typeof PLAYER_CONFIGS)[number];

export function getPalette(id: number): PlayerPalette {
  const p = PLAYER_PALETTE.find((c) => c.id === id);
  if (!p) throw new Error(`Unknown player id: ${id}`);
  return p;
}
