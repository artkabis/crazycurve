import { TRAIL_RADIUS, SERVER_TICK_MS } from '../core/constants.ts';
import type { GamePhase, IGameState, CurveRenderData, Vec2, PickupRenderData, PowerUpType } from '../core/types.ts';
import type { TickPayload } from './protocol.ts';

/**
 * Shadow curve with client-side linear interpolation between server ticks.
 * x/y/angle are getters that return the smoothly interpolated value based on
 * elapsed time since the last received tick — gives 60fps fluidity from 30Hz ticks.
 */
class ShadowCurve implements CurveRenderData {
  private prevX = 0;
  private prevY = 0;
  private prevAngle = 0;
  private targetX = 0;
  private targetY = 0;
  private targetAngle = 0;
  private lastTickAt = 0;

  private _alive = true;
  private _inGap = true;

  trailRadius: number;
  ghostTrail = false;
  activeEffects: PowerUpType[] = [];
  newPoints: Vec2[] = [];

  constructor(
    readonly id: number,
    x: number,
    y: number,
    alive: boolean,
    inGap: boolean,
    trailRadius = TRAIL_RADIUS,
  ) {
    this.prevX = this.targetX = x;
    this.prevY = this.targetY = y;
    this._alive = alive;
    this._inGap = inGap;
    this.trailRadius = trailRadius;
    this.lastTickAt = performance.now();
  }

  get x(): number { return this.lerp(this.prevX, this.targetX); }
  get y(): number { return this.lerp(this.prevY, this.targetY); }
  get alive(): boolean { return this._alive; }
  get inGap(): boolean { return this._inGap; }

  get angle(): number {
    const alpha = this.alpha();
    let diff = this.targetAngle - this.prevAngle;
    while (diff > Math.PI) diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;
    return this.prevAngle + diff * alpha;
  }

  updateFromSnap(
    x: number,
    y: number,
    angle: number,
    alive: boolean,
    inGap: boolean,
    trailRadius: number,
    ghostTrail: boolean,
    activeEffects: PowerUpType[],
  ): void {
    this.prevX = this.x;
    this.prevY = this.y;
    this.prevAngle = this.angle;
    this.targetX = x;
    this.targetY = y;
    this.targetAngle = angle;
    this._alive = alive;
    this._inGap = inGap;
    this.trailRadius = trailRadius;
    this.ghostTrail = ghostTrail;
    this.activeEffects = activeEffects;
    this.lastTickAt = performance.now();
  }

  private alpha(): number {
    return Math.min(1, (performance.now() - this.lastTickAt) / SERVER_TICK_MS);
  }

  private lerp(a: number, b: number): number {
    return a + (b - a) * this.alpha();
  }
}

export class NetworkGameState implements IGameState {
  phase: GamePhase = 'countdown';
  round = 0;
  countdown = 3;

  private readonly shadowMap = new Map<number, ShadowCurve>();
  private readonly scoreMap = new Map<number, number>();
  private _pickups: PickupRenderData[] = [];

  constructor(playerIds: readonly number[]) {
    for (const id of playerIds) {
      this.shadowMap.set(id, new ShadowCurve(id, 0, 0, true, true));
      this.scoreMap.set(id, 0);
    }
  }

  get curves(): readonly ShadowCurve[] {
    return [...this.shadowMap.values()];
  }

  get pickups(): readonly PickupRenderData[] {
    return this._pickups;
  }

  getScore(playerId: number): number {
    return this.scoreMap.get(playerId) ?? 0;
  }

  getScoresMap(): Map<number, number> {
    return new Map(this.scoreMap);
  }

  applyTick(payload: TickPayload): void {
    this.phase = payload.phase;
    this.round = payload.round;
    this.countdown = payload.countdown;

    for (const [id] of this.scoreMap) {
      this.scoreMap.set(id, payload.scores[id] ?? 0);
    }

    for (const snap of payload.players) {
      let shadow = this.shadowMap.get(snap.id);
      if (!shadow) {
        shadow = new ShadowCurve(snap.id, snap.x, snap.y, snap.alive, snap.inGap, snap.trailRadius);
        this.shadowMap.set(snap.id, shadow);
        this.scoreMap.set(snap.id, 0);
      }

      shadow.updateFromSnap(
        snap.x, snap.y, snap.angle,
        snap.alive, snap.inGap,
        snap.trailRadius, snap.ghostTrail,
        snap.activeEffects,
      );

      // Trail painted at authoritative server position, not interpolated
      shadow.newPoints =
        snap.alive && !snap.inGap && !snap.ghostTrail ? [{ x: snap.x, y: snap.y }] : [];
    }

    this._pickups = payload.pickups;
  }

  clearNewPoints(): void {
    for (const shadow of this.shadowMap.values()) shadow.newPoints = [];
  }
}
