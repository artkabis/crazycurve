import type { PowerUpType } from './types.ts';

// ── Arena ──────────────────────────────────────────────────────
export const ARENA_WIDTH  = 800;
export const ARENA_HEIGHT = 600;

// ── Physics — expressed per-second, converted in Curve.reset() ─
export const PLAYER_SPEED_PPS = 75;    // pixels / second
export const TURN_RATE_RPS    = 1.26;  // radians / second
export const TRAIL_RADIUS     = 3.5;   // pixels (geometry, tick-independent)

// ── Gap mechanic — seconds, converted to ticks in Curve.reset() ─
export const GAP_INTERVAL_MIN_S = 5.0;
export const GAP_INTERVAL_MAX_S = 9.3;
export const GAP_DURATION_MIN_S = 0.6;
export const GAP_DURATION_MAX_S = 1.1;
export const STARTUP_GAP_S      = 1.5;

// ── Game rules ─────────────────────────────────────────────────
export const SCORE_TO_WIN        = 10;
export const ROUND_OVER_DELAY_MS = 2500;
export const COUNTDOWN_SECONDS   = 3;

// ── Server ─────────────────────────────────────────────────────
export const SERVER_TICK_RATE = 30;
export const SERVER_TICK_MS   = 1000 / SERVER_TICK_RATE;
export const MIN_PLAYERS      = 2;
export const MAX_PLAYERS      = 6;

// ── Power-ups ──────────────────────────────────────────────────
export interface PowerUpConfig {
  type:       PowerUpType;
  color:      number;
  label:      string;
  duration:   number;    // seconds; 0 = instant
  targetSelf: boolean;
}

export const POWERUP_CONFIGS: PowerUpConfig[] = [
  { type: 'speed_boost', color: 0xffdd00, label: 'FAST',    duration:  5, targetSelf: true  },
  { type: 'slow',        color: 0x4488ff, label: 'SLOW',    duration:  5, targetSelf: false },
  { type: 'reverse',     color: 0xff4488, label: 'REV',     duration:  4, targetSelf: false },
  { type: 'freeze',      color: 0x88ddff, label: 'FREEZE',  duration:  3, targetSelf: false },
  { type: 'ghost',       color: 0xcccccc, label: 'GHOST',   duration:  4, targetSelf: true  },
  { type: 'thin',        color: 0x44ff88, label: 'THIN',    duration:  6, targetSelf: true  },
  { type: 'thick',       color: 0xff6600, label: 'THICK',   duration:  4, targetSelf: false },
  { type: 'teleport',    color: 0xff00ff, label: 'WARP',    duration:  0, targetSelf: true  },
  { type: 'shield',      color: 0x00ffcc, label: 'SHIELD',  duration: 10, targetSelf: true  },
  { type: 'eraser',      color: 0xff8800, label: 'ERASE',   duration:  0, targetSelf: true  },
  { type: 'missile',     color: 0xff2222, label: 'FIRE',    duration:  0, targetSelf: true  },
];

export const ERASER_RADIUS            = 44;
export const POWERUP_SPAWN_INTERVAL_S = 6;
export const POWERUP_MAX_ACTIVE       = 5;
export const POWERUP_RADIUS           = 12;

// ── Players ────────────────────────────────────────────────────
export const PLAYER_PALETTE = [
  { id: 1, name: 'P1', color: 0xff4466, colorHex: '#ff4466', leftKey: 'ArrowLeft', rightKey: 'ArrowRight' },
  { id: 2, name: 'P2', color: 0x44aaff, colorHex: '#44aaff', leftKey: 'a',         rightKey: 'd'           },
  { id: 3, name: 'P3', color: 0x44ff88, colorHex: '#44ff88', leftKey: 'n',         rightKey: 'm'           },
  { id: 4, name: 'P4', color: 0xffaa00, colorHex: '#ffaa00', leftKey: 'f',         rightKey: 'g'           },
  { id: 5, name: 'P5', color: 0xaa44ff, colorHex: '#aa44ff', leftKey: '1',         rightKey: '2'           },
  { id: 6, name: 'P6', color: 0x00ddff, colorHex: '#00ddff', leftKey: '7',         rightKey: '8'           },
] as const;

export type PlayerPalette = (typeof PLAYER_PALETTE)[number];

export const PLAYER_CONFIGS = PLAYER_PALETTE.slice(0, 2);
export type PlayerConfig = (typeof PLAYER_CONFIGS)[number];

export function getPalette(id: number): PlayerPalette {
  const p = PLAYER_PALETTE.find((c) => c.id === id);
  if (!p) throw new Error(`Unknown player id: ${id}`);
  return p;
}

export type BotDifficulty = 'easy' | 'medium' | 'hard';

export interface LocalPlayerSetup {
  id:             number;
  name:           string;
  color:          number;
  colorHex:       string;
  leftKey:        string;
  rightKey:       string;
  isBot?:         boolean;
  botDifficulty?: BotDifficulty;
}
