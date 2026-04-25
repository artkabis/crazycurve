"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server/src/server.ts
var import_express = __toESM(require("express"), 1);
var import_node_http = require("node:http");
var import_node_path = require("node:path");
var import_socket = require("socket.io");

// src/core/constants.ts
var ARENA_WIDTH = 800;
var ARENA_HEIGHT = 600;
var PLAYER_SPEED = 2.5;
var TURN_RATE = 0.042;
var TRAIL_RADIUS = 3.5;
var GAP_INTERVAL_MIN = 150;
var GAP_INTERVAL_MAX = 280;
var GAP_DURATION_MIN = 18;
var GAP_DURATION_MAX = 32;
var STARTUP_GAP_FRAMES = 40;
var SCORE_TO_WIN = 10;
var ROUND_OVER_DELAY_MS = 2500;
var COUNTDOWN_SECONDS = 3;
var SERVER_TICK_RATE = 30;
var SERVER_TICK_MS = 1e3 / SERVER_TICK_RATE;
var MIN_PLAYERS = 2;
var MAX_PLAYERS = 6;
var POWERUP_CONFIGS = [
  { type: "speed_boost", color: 16768256, label: "FAST", duration: 150, targetSelf: true },
  { type: "slow", color: 4491519, label: "SLOW", duration: 150, targetSelf: false },
  { type: "reverse", color: 16729224, label: "REV", duration: 120, targetSelf: false },
  { type: "freeze", color: 8969727, label: "FREEZE", duration: 90, targetSelf: false },
  { type: "ghost", color: 13421772, label: "GHOST", duration: 120, targetSelf: true },
  { type: "thin", color: 4521864, label: "THIN", duration: 180, targetSelf: true },
  { type: "thick", color: 16737792, label: "THICK", duration: 120, targetSelf: false },
  { type: "teleport", color: 16711935, label: "WARP", duration: 0, targetSelf: true },
  { type: "shield", color: 65484, label: "SHIELD", duration: 300, targetSelf: true },
  { type: "eraser", color: 16746496, label: "ERASE", duration: 0, targetSelf: true }
];
var ERASER_RADIUS = 44;
var POWERUP_SPAWN_INTERVAL = 180;
var POWERUP_MAX_ACTIVE = 5;
var POWERUP_RADIUS = 12;
var PLAYER_PALETTE = [
  { id: 1, name: "P1", color: 16729190, colorHex: "#ff4466", leftKey: "ArrowLeft", rightKey: "ArrowRight" },
  { id: 2, name: "P2", color: 4500223, colorHex: "#44aaff", leftKey: "a", rightKey: "d" },
  { id: 3, name: "P3", color: 4521864, colorHex: "#44ff88", leftKey: "n", rightKey: "m" },
  { id: 4, name: "P4", color: 16755200, colorHex: "#ffaa00", leftKey: "f", rightKey: "g" },
  { id: 5, name: "P5", color: 11158783, colorHex: "#aa44ff", leftKey: "1", rightKey: "2" },
  { id: 6, name: "P6", color: 56831, colorHex: "#00ddff", leftKey: "7", rightKey: "8" }
];
var PLAYER_CONFIGS = PLAYER_PALETTE.slice(0, 2);
function getPalette(id) {
  const p = PLAYER_PALETTE.find((c) => c.id === id);
  if (!p) throw new Error(`Unknown player id: ${id}`);
  return p;
}

// src/core/systems/CollisionSystem.ts
var CollisionSystem = class {
  grid;
  w = ARENA_WIDTH;
  h = ARENA_HEIGHT;
  constructor() {
    this.grid = new Uint8Array(this.w * this.h);
  }
  reset() {
    this.grid.fill(0);
  }
  paint(x, y, ownerId, radius = TRAIL_RADIUS) {
    const cx = Math.round(x);
    const cy = Math.round(y);
    const r = Math.ceil(radius);
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy <= radius * radius) {
          const px = cx + dx;
          const py = cy + dy;
          if (px >= 0 && px < this.w && py >= 0 && py < this.h) {
            this.grid[py * this.w + px] = ownerId;
          }
        }
      }
    }
  }
  checkWall(x, y, radius = TRAIL_RADIUS) {
    return x - radius < 1 || x + radius >= this.w - 1 || y - radius < 1 || y + radius >= this.h - 1;
  }
  erase(x, y, radius) {
    const cx = Math.round(x);
    const cy = Math.round(y);
    const r = Math.ceil(radius);
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy <= radius * radius) {
          const px = cx + dx;
          const py = cy + dy;
          if (px >= 0 && px < this.w && py >= 0 && py < this.h) {
            this.grid[py * this.w + px] = 0;
          }
        }
      }
    }
  }
  checkTrail(x, y) {
    const cx = Math.round(x);
    const cy = Math.round(y);
    if (cx < 0 || cx >= this.w || cy < 0 || cy >= this.h) return true;
    return this.grid[cy * this.w + cx] !== 0;
  }
};

// src/core/systems/ScoreSystem.ts
var ScoreSystem = class {
  scores = /* @__PURE__ */ new Map();
  constructor(playerIds) {
    for (const id of playerIds) {
      this.scores.set(id, 0);
    }
  }
  reset() {
    for (const id of this.scores.keys()) {
      this.scores.set(id, 0);
    }
  }
  addPoint(playerId) {
    this.scores.set(playerId, (this.scores.get(playerId) ?? 0) + 1);
  }
  getScore(playerId) {
    return this.scores.get(playerId) ?? 0;
  }
  getScores() {
    return this.scores;
  }
  getWinner(toWin) {
    for (const [id, score] of this.scores) {
      if (score >= toWin) return id;
    }
    return null;
  }
};

// src/core/entities/PowerUp.ts
var nextPickupId = 1;
var Pickup = class {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.id = nextPickupId++;
  }
  id;
  collected = false;
};

// src/core/systems/PowerUpSystem.ts
var PowerUpSystem = class {
  constructor(onPickup, onErase) {
    this.onPickup = onPickup;
    this.onErase = onErase;
  }
  pickups = [];
  spawnTimer = 0;
  reset() {
    this.pickups = [];
    this.spawnTimer = 0;
  }
  update(curves, collision, currentTick) {
    for (const c of curves) c.tickEffects(currentTick);
    this.spawnTimer++;
    if (this.spawnTimer >= POWERUP_SPAWN_INTERVAL && this.pickups.length < POWERUP_MAX_ACTIVE) {
      this.spawnTimer = 0;
      this.trySpawn(collision);
    }
    for (const pickup of this.pickups) {
      if (pickup.collected) continue;
      for (const curve of curves) {
        if (!curve.alive) continue;
        const dx = curve.x - pickup.x;
        const dy = curve.y - pickup.y;
        if (dx * dx + dy * dy <= POWERUP_RADIUS * POWERUP_RADIUS) {
          pickup.collected = true;
          this.applyEffect(pickup.type, curve, curves, currentTick, collision);
          this.onPickup?.(pickup.type, curve.id);
          break;
        }
      }
    }
    this.pickups = this.pickups.filter((p) => !p.collected);
  }
  getPickupsSnapshot() {
    return this.pickups.map((p) => ({ id: p.id, x: p.x, y: p.y, type: p.type }));
  }
  trySpawn(collision) {
    const margin = 60;
    for (let i = 0; i < 12; i++) {
      const x = margin + Math.random() * (ARENA_WIDTH - margin * 2);
      const y = margin + Math.random() * (ARENA_HEIGHT - margin * 2);
      if (!collision.checkTrail(x, y) && !collision.checkWall(x, y)) {
        const cfg = POWERUP_CONFIGS[Math.floor(Math.random() * POWERUP_CONFIGS.length)];
        this.pickups.push(new Pickup(x, y, cfg.type));
        return;
      }
    }
  }
  applyEffect(type, collector, allCurves, currentTick, collision) {
    const cfg = POWERUP_CONFIGS.find((c) => c.type === type);
    if (type === "teleport") {
      const margin = 80;
      const x = margin + Math.random() * (ARENA_WIDTH - margin * 2);
      const y = margin + Math.random() * (ARENA_HEIGHT - margin * 2);
      collector.teleport(x, y, Math.random() * Math.PI * 2);
      return;
    }
    if (type === "eraser") {
      collision.erase(collector.x, collector.y, ERASER_RADIUS);
      this.onErase?.(collector.x, collector.y, ERASER_RADIUS);
      return;
    }
    const targets = cfg.targetSelf ? [collector] : allCurves.filter((c) => c.id !== collector.id && c.alive);
    const expiresAt = currentTick + cfg.duration;
    for (const t of targets) t.applyEffect(type, expiresAt);
  }
};

// src/core/entities/Curve.ts
function randInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}
var Curve = class {
  id;
  color;
  x = 0;
  y = 0;
  angle = 0;
  alive = true;
  speed = PLAYER_SPEED;
  turnRate = TURN_RATE;
  trailRadius = TRAIL_RADIUS;
  inverseControls = false;
  frozen = false;
  ghostTrail = false;
  effects = /* @__PURE__ */ new Map();
  // type → expiresAtTick
  gapActive = true;
  gapTimer = 0;
  gapDuration = STARTUP_GAP_FRAMES;
  nextGapIn = 0;
  newPoints = [];
  constructor(id, color) {
    this.id = id;
    this.color = color;
  }
  reset(x, y, angle) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.alive = true;
    this.effects.clear();
    this.inverseControls = false;
    this.frozen = false;
    this.ghostTrail = false;
    this.speed = PLAYER_SPEED;
    this.turnRate = TURN_RATE;
    this.trailRadius = TRAIL_RADIUS;
    this.gapActive = true;
    this.gapTimer = 0;
    this.gapDuration = STARTUP_GAP_FRAMES;
    this.nextGapIn = randInt(GAP_INTERVAL_MIN, GAP_INTERVAL_MAX);
    this.newPoints = [];
  }
  get inGap() {
    return this.gapActive;
  }
  get activeEffects() {
    return [...this.effects.keys()];
  }
  get shielded() {
    return this.effects.has("shield");
  }
  applyEffect(type, expiresAtTick) {
    this.effects.set(type, expiresAtTick);
    this.recalcEffects();
  }
  tickEffects(currentTick) {
    let changed = false;
    for (const [type, exp] of this.effects) {
      if (currentTick >= exp) {
        this.effects.delete(type);
        changed = true;
      }
    }
    if (changed) this.recalcEffects();
  }
  teleport(x, y, newAngle) {
    this.x = x;
    this.y = y;
    this.angle = newAngle;
    this.gapActive = true;
    this.gapTimer = 0;
    this.gapDuration = 20;
  }
  recalcEffects() {
    this.inverseControls = this.effects.has("reverse");
    this.frozen = this.effects.has("freeze");
    this.ghostTrail = this.effects.has("ghost");
    this.speed = this.effects.has("speed_boost") ? PLAYER_SPEED * 1.7 : this.effects.has("slow") ? PLAYER_SPEED * 0.5 : PLAYER_SPEED;
    this.trailRadius = this.effects.has("thin") ? TRAIL_RADIUS * 0.5 : this.effects.has("thick") ? TRAIL_RADIUS * 2.5 : TRAIL_RADIUS;
  }
  update(input, collision) {
    if (!this.alive) return;
    if (this.frozen) return;
    this.newPoints = [];
    const left = this.inverseControls ? input.right : input.left;
    const right = this.inverseControls ? input.left : input.right;
    if (left) this.angle -= this.turnRate;
    if (right) this.angle += this.turnRate;
    const nx = this.x + Math.cos(this.angle) * this.speed;
    const ny = this.y + Math.sin(this.angle) * this.speed;
    const hitWall = collision.checkWall(nx, ny, this.trailRadius);
    const hitTrail = !this.gapActive && !this.ghostTrail && collision.checkTrail(nx, ny);
    if (hitWall) {
      this.alive = false;
      return;
    }
    if (hitTrail) {
      if (this.shielded) {
        this.effects.delete("shield");
        this.recalcEffects();
      } else {
        this.alive = false;
        return;
      }
    }
    this.x = nx;
    this.y = ny;
    if (!this.gapActive) {
      if (!this.ghostTrail) {
        collision.paint(this.x, this.y, this.id, this.trailRadius);
      }
      this.newPoints.push({ x: this.x, y: this.y });
    }
    this.tickGap();
  }
  tickGap() {
    this.gapTimer++;
    if (this.gapActive) {
      if (this.gapTimer >= this.gapDuration) {
        this.gapActive = false;
        this.gapTimer = 0;
        this.nextGapIn = randInt(GAP_INTERVAL_MIN, GAP_INTERVAL_MAX);
      }
    } else {
      if (this.gapTimer >= this.nextGapIn) {
        this.gapActive = true;
        this.gapTimer = 0;
        this.gapDuration = randInt(GAP_DURATION_MIN, GAP_DURATION_MAX);
      }
    }
  }
};

// src/core/EventEmitter.ts
var TypedEventEmitter = class {
  listeners = /* @__PURE__ */ new Map();
  on(event, listener) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, /* @__PURE__ */ new Set());
    }
    const set = this.listeners.get(event);
    set.add(listener);
    return () => set.delete(listener);
  }
  emit(event, ...args) {
    this.listeners.get(event)?.forEach((fn) => fn(...args));
  }
  off(event, listener) {
    this.listeners.get(event)?.delete(listener);
  }
  removeAllListeners() {
    this.listeners.clear();
  }
};

// src/core/GameEngine.ts
function randomSpawn(index, total) {
  const margin = 100;
  const sliceW = (ARENA_WIDTH - margin * 2) / total;
  return {
    x: margin + sliceW * index + Math.random() * sliceW,
    y: margin + Math.random() * (ARENA_HEIGHT - margin * 2),
    angle: Math.random() * Math.PI * 2
  };
}
var GameEngine = class extends TypedEventEmitter {
  constructor(playerIds = PLAYER_CONFIGS.map((p) => p.id), scoreToWin = SCORE_TO_WIN) {
    super();
    this.scoreToWin = scoreToWin;
    this.scores = new ScoreSystem(playerIds);
    this.curves = playerIds.map((id) => {
      const cfg = getPalette(id);
      return new Curve(cfg.id, cfg.color);
    });
  }
  collision = new CollisionSystem();
  scores;
  curves;
  phase = "menu";
  round = 0;
  countdown = COUNTDOWN_SECONDS;
  powerUps = new PowerUpSystem(
    (type, id) => this.emit("pickup", type, id),
    (x, y, r) => this.emit("eraseZone", x, y, r)
  );
  engineTick = 0;
  countdownStart = 0;
  roundOverAt = 0;
  roundOverHandled = false;
  get pickups() {
    return this.powerUps.getPickupsSnapshot();
  }
  getScore(playerId) {
    return this.scores.getScore(playerId);
  }
  startGame() {
    this.scores.reset();
    this.round = 0;
    this.engineTick = 0;
    this.beginRound();
  }
  update(inputs, now) {
    switch (this.phase) {
      case "countdown":
        this.tickCountdown(now);
        break;
      case "playing":
        this.tickPlaying(inputs, now);
        break;
      case "round_over":
        this.tickRoundOver(now);
        break;
    }
  }
  beginRound() {
    this.round++;
    this.collision.reset();
    this.powerUps.reset();
    this.roundOverHandled = false;
    this.curves.forEach((curve, i) => {
      const pos = randomSpawn(i, this.curves.length);
      curve.reset(pos.x, pos.y, pos.angle);
    });
    this.countdown = COUNTDOWN_SECONDS;
    this.countdownStart = performance.now();
    this.setPhase("countdown");
  }
  tickCountdown(now) {
    const elapsed = now - this.countdownStart;
    const remaining = Math.ceil(COUNTDOWN_SECONDS - elapsed / 1e3);
    if (remaining !== this.countdown) {
      this.countdown = Math.max(1, remaining);
    }
    if (elapsed >= COUNTDOWN_SECONDS * 1e3) {
      this.setPhase("playing");
    }
  }
  tickPlaying(inputs, now) {
    this.engineTick++;
    this.powerUps.update(this.curves, this.collision, this.engineTick);
    const newlyDead = [];
    for (const curve of this.curves) {
      const wasAlive = curve.alive;
      const input = inputs.get(curve.id) ?? { left: false, right: false };
      curve.update(input, this.collision);
      if (wasAlive && !curve.alive) newlyDead.push(curve.id);
    }
    for (const deadId of newlyDead) {
      this.emit("playerDied", deadId);
      for (const c of this.curves) {
        if (c.alive) this.scores.addPoint(c.id);
      }
    }
    if (this.roundOverHandled) return;
    const alive = this.curves.filter((c) => c.alive);
    if (alive.length <= 1) {
      this.roundOverHandled = true;
      this.roundOverAt = now;
      this.setPhase("round_over");
      this.emit("roundOver", alive[0]?.id ?? null);
    }
  }
  tickRoundOver(now) {
    if (now - this.roundOverAt < ROUND_OVER_DELAY_MS) return;
    const gameWinnerId = this.scores.getWinner(this.scoreToWin);
    if (gameWinnerId !== null) {
      this.setPhase("game_over");
      this.emit("gameOver", gameWinnerId);
    } else {
      this.beginRound();
    }
  }
  setPhase(phase) {
    this.phase = phase;
    this.emit("phaseChange", phase);
  }
};

// server/src/game/Room.ts
var RECONNECT_WINDOW_MS = 2e4;
var Room = class {
  constructor(id, io2) {
    this.io = io2;
    this.id = id;
  }
  id;
  players = /* @__PURE__ */ new Map();
  engine = null;
  tickInterval = null;
  tick = 0;
  pendingEvents = [];
  nextId = 1;
  get playerCount() {
    return this.players.size;
  }
  get isFull() {
    const active = [...this.players.values()].filter((p) => p.socket !== null).length;
    return active >= MAX_PLAYERS;
  }
  get isEmpty() {
    return this.players.size === 0;
  }
  get isRunning() {
    return this.tickInterval !== null;
  }
  addPlayer(socket, name) {
    if (this.isRunning) {
      for (const [oldSid, player] of this.players) {
        if (player.disconnectedAt !== void 0 && player.info.name === name) {
          clearTimeout(player.cleanupTimer);
          this.players.delete(oldSid);
          player.socket = socket;
          player.disconnectedAt = void 0;
          player.cleanupTimer = void 0;
          this.players.set(socket.id, player);
          socket.join(this.id);
          return player.info;
        }
      }
      return null;
    }
    if (this.isFull || this.nextId > MAX_PLAYERS) return null;
    const palette = getPalette(this.nextId);
    const info = {
      id: this.nextId++,
      name: name.slice(0, 16) || palette.name,
      color: palette.color,
      colorHex: palette.colorHex
    };
    this.players.set(socket.id, { socket, info, pendingInput: { left: false, right: false } });
    socket.join(this.id);
    socket.to(this.id).emit("player_joined", info);
    return info;
  }
  removePlayer(socketId) {
    const player = this.players.get(socketId);
    if (!player) return;
    if (this.isRunning) {
      player.socket = null;
      player.disconnectedAt = Date.now();
      this.io.to(this.id).emit("player_left", player.info.id);
      player.cleanupTimer = setTimeout(() => {
        if (this.players.has(socketId) && player.disconnectedAt !== void 0) {
          this.players.delete(socketId);
          const connected = [...this.players.values()].filter((p) => p.socket !== null).length;
          if (connected < MIN_PLAYERS) this.stopLoop();
        }
      }, RECONNECT_WINDOW_MS);
    } else {
      this.players.delete(socketId);
      this.io.to(this.id).emit("player_left", player.info.id);
      if (this.players.size < MIN_PLAYERS) this.stopLoop();
    }
  }
  receiveInput(socketId, left, right) {
    const p = this.players.get(socketId);
    if (p && p.socket !== null) p.pendingInput = { left, right };
  }
  tryStart() {
    if (this.players.size < MIN_PLAYERS || this.isRunning) return false;
    const playerIds = [...this.players.values()].map((p) => p.info.id);
    this.engine = new GameEngine(playerIds);
    this.engine.on("playerDied", (id) => this.pendingEvents.push({ type: "player_died", playerId: id }));
    this.engine.on("roundOver", (id) => this.pendingEvents.push({ type: "round_over", winnerId: id ?? null }));
    this.engine.on("gameOver", (id) => this.pendingEvents.push({ type: "game_over", winnerId: id }));
    this.engine.on("eraseZone", (x, y, r) => this.pendingEvents.push({ type: "erase_zone", x, y, radius: r }));
    this.engine.startGame();
    this.io.to(this.id).emit("game_start");
    this.tickInterval = setInterval(() => this.gameTick(), SERVER_TICK_MS);
    return true;
  }
  stopLoop() {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
    for (const player of this.players.values()) {
      if (player.cleanupTimer) clearTimeout(player.cleanupTimer);
    }
    this.engine = null;
  }
  gameTick() {
    const engine = this.engine;
    if (!engine) return;
    this.tick++;
    this.pendingEvents = [];
    const inputs = new Map(
      [...this.players.values()].map((p) => [
        p.info.id,
        p.socket !== null ? p.pendingInput : { left: false, right: false }
      ])
    );
    engine.update(inputs, performance.now());
    for (const curve of engine.curves) curve.newPoints = [];
    const scores = {};
    for (const p of this.players.values()) {
      scores[p.info.id] = engine.scores.getScore(p.info.id);
    }
    const payload = {
      tick: this.tick,
      phase: engine.phase,
      round: engine.round,
      countdown: engine.countdown,
      players: engine.curves.map((c) => ({
        id: c.id,
        x: c.x,
        y: c.y,
        angle: c.angle,
        alive: c.alive,
        inGap: c.inGap,
        trailRadius: c.trailRadius,
        ghostTrail: c.ghostTrail,
        activeEffects: [...c.activeEffects]
      })),
      events: this.pendingEvents,
      scores,
      pickups: engine.pickups
    };
    this.io.to(this.id).emit("tick", payload);
    if (engine.scores.getWinner(SCORE_TO_WIN) !== null) {
      this.stopLoop();
    }
  }
};

// server/src/game/RoomManager.ts
function makeId() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}
var RoomManager = class {
  constructor(io2) {
    this.io = io2;
  }
  rooms = /* @__PURE__ */ new Map();
  join(socket, name, roomId) {
    let room = null;
    let isReconnect = false;
    if (roomId) {
      room = this.rooms.get(roomId) ?? null;
      if (!room) return null;
      if (room.isRunning) isReconnect = true;
      else if (room.isFull) return null;
    } else {
      for (const r of this.rooms.values()) {
        if (!r.isFull && !r.isRunning) {
          room = r;
          break;
        }
      }
      if (!room) room = this.createRoom();
    }
    const playerInfo = room.addPlayer(socket, name);
    if (!playerInfo) return null;
    if (!room.isRunning && room.playerCount >= 2) {
      setTimeout(() => room.tryStart(), 1e3);
    }
    return { room, playerInfo, isReconnect };
  }
  leave(socketId) {
    for (const [id, room] of this.rooms) {
      if (room.isEmpty) {
        this.rooms.delete(id);
        continue;
      }
      room.removePlayer(socketId);
      if (room.isEmpty) this.rooms.delete(id);
    }
  }
  getRoom(id) {
    return this.rooms.get(id);
  }
  createRoom() {
    const id = makeId();
    const room = new Room(id, this.io);
    this.rooms.set(id, room);
    return room;
  }
};

// server/src/server.ts
var IS_PROD = process.env.NODE_ENV === "production";
var PORT = Number(process.env.PORT ?? 3001);
var app = (0, import_express.default)();
var httpServer = (0, import_node_http.createServer)(app);
if (IS_PROD) {
  const distPath = (0, import_node_path.join)(process.cwd(), "dist");
  app.use(import_express.default.static(distPath, { maxAge: "1d" }));
  app.get("*", (_req, res) => res.sendFile((0, import_node_path.join)(distPath, "index.html")));
}
var io = new import_socket.Server(httpServer, {
  cors: IS_PROD ? { origin: false } : { origin: "*" },
  transports: ["websocket", "polling"]
});
var rooms = new RoomManager(io);
io.on("connection", (socket) => {
  let currentRoomId = null;
  socket.on("join", ({ name, roomId }) => {
    const result = rooms.join(socket, name ?? "Player", roomId);
    if (!result) {
      socket.emit("error", roomId ? "Room not found or full." : "Could not join a room.");
      return;
    }
    const { room, playerInfo, isReconnect } = result;
    currentRoomId = room.id;
    socket.emit("room_joined", {
      roomId: room.id,
      yourPlayerId: playerInfo.id,
      players: [],
      isReconnect
    });
  });
  socket.on("input", ({ left, right }) => {
    if (currentRoomId) rooms.getRoom(currentRoomId)?.receiveInput(socket.id, left, right);
  });
  socket.on("disconnect", () => rooms.leave(socket.id));
});
app.get(
  "/health",
  (_req, res) => res.json({ status: "ok", uptime: process.uptime(), rooms: io.sockets.adapter.rooms.size })
);
httpServer.listen(
  PORT,
  () => console.log(`[crazycurve] ${IS_PROD ? "production" : "dev"} server \u2192 http://localhost:${PORT}`)
);
