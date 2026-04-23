import { TRAIL_RADIUS } from '../core/constants.ts';
import type { GamePhase, IGameState, CurveRenderData, Vec2 } from '../core/types.ts';
import type { TickPayload } from './protocol.ts';

/** Mutable shadow curve updated from server snapshots */
class ShadowCurve implements CurveRenderData {
  readonly trailRadius = TRAIL_RADIUS;
  newPoints: Vec2[] = [];

  constructor(
    readonly id: number,
    public x: number,
    public y: number,
    public alive: boolean,
    public inGap: boolean,
  ) {}
}

/**
 * Client-side authoritative state built from server tick payloads.
 * Implements IGameState so GameRenderer can accept it without modification.
 */
export class NetworkGameState implements IGameState {
  phase: GamePhase = 'countdown';
  round = 0;
  countdown = 3;

  private readonly shadowMap = new Map<number, ShadowCurve>();
  private readonly scoreMap = new Map<number, number>();

  constructor(playerIds: readonly number[]) {
    for (const id of playerIds) {
      this.shadowMap.set(id, new ShadowCurve(id, 0, 0, true, true));
      this.scoreMap.set(id, 0);
    }
  }

  get curves(): readonly ShadowCurve[] {
    return [...this.shadowMap.values()];
  }

  getScore(playerId: number): number {
    return this.scoreMap.get(playerId) ?? 0;
  }

  /** Apply a server tick — updates state and marks new trail points. */
  applyTick(payload: TickPayload): void {
    this.phase = payload.phase;
    this.round = payload.round;
    this.countdown = payload.countdown;

    for (const [id] of this.scoreMap) {
      this.scoreMap.set(id, payload.scores[id] ?? 0);
    }

    for (const snap of payload.players) {
      const shadow = this.shadowMap.get(snap.id);
      if (!shadow) continue;

      shadow.x = snap.x;
      shadow.y = snap.y;
      shadow.alive = snap.alive;
      shadow.inGap = snap.inGap;

      // Only paint trail when alive and not in gap
      shadow.newPoints = snap.alive && !snap.inGap ? [{ x: snap.x, y: snap.y }] : [];
    }
  }

  /** Call after TrailLayer has consumed newPoints each render frame. */
  clearNewPoints(): void {
    for (const shadow of this.shadowMap.values()) {
      shadow.newPoints = [];
    }
  }

  resetTrails(): void {
    this.clearNewPoints();
  }
}
