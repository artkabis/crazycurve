import { PLAYER_CONFIGS } from '../constants.ts';

export class ScoreSystem {
  private readonly scores = new Map<number, number>();

  constructor() {
    this.reset();
  }

  reset(): void {
    for (const cfg of PLAYER_CONFIGS) {
      this.scores.set(cfg.id, 0);
    }
  }

  addPoint(playerId: number): void {
    this.scores.set(playerId, (this.scores.get(playerId) ?? 0) + 1);
  }

  getScore(playerId: number): number {
    return this.scores.get(playerId) ?? 0;
  }

  getScores(): ReadonlyMap<number, number> {
    return this.scores;
  }

  getWinner(toWin: number): number | null {
    for (const [id, score] of this.scores) {
      if (score >= toWin) return id;
    }
    return null;
  }
}
