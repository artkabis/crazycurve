import { TRAIL_RADIUS } from '../core/constants.ts';
import type { GamePhase, IGameState, CurveRenderData, Vec2, PickupRenderData, PowerUpType } from '../core/types.ts';
import type { TickPayload } from './protocol.ts';

class ShadowCurve implements CurveRenderData {
  trailRadius: number;
  ghostTrail = false;
  activeEffects: PowerUpType[] = [];
  newPoints: Vec2[] = [];
  angle = 0;

  constructor(
    readonly id: number,
    public x: number,
    public y: number,
    public alive: boolean,
    public inGap: boolean,
    trailRadius = TRAIL_RADIUS,
  ) {
    this.trailRadius = trailRadius;
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

      shadow.x = snap.x;
      shadow.y = snap.y;
      shadow.angle = snap.angle;
      shadow.alive = snap.alive;
      shadow.inGap = snap.inGap;
      shadow.trailRadius = snap.trailRadius;
      shadow.ghostTrail = snap.ghostTrail;
      shadow.activeEffects = snap.activeEffects;

      shadow.newPoints =
        snap.alive && !snap.inGap && !snap.ghostTrail ? [{ x: snap.x, y: snap.y }] : [];
    }

    this._pickups = payload.pickups;
  }

  clearNewPoints(): void {
    for (const shadow of this.shadowMap.values()) {
      shadow.newPoints = [];
    }
  }

  resetTrails(): void {
    this.clearNewPoints();
  }
}
