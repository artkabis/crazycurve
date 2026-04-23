export class ScoreSystem {
  private readonly scores = new Map<number, number>();

  constructor(playerIds: readonly number[]) {
    for (const id of playerIds) {
      this.scores.set(id, 0);
    }
  }

  reset(): void {
    for (const id of this.scores.keys()) {
      this.scores.set(id, 0);
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
