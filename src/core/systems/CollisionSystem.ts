import { ARENA_WIDTH, ARENA_HEIGHT, TRAIL_RADIUS } from '../constants.ts';

export class CollisionSystem {
  private readonly grid: Uint8Array;
  private readonly w = ARENA_WIDTH;
  private readonly h = ARENA_HEIGHT;

  constructor() {
    this.grid = new Uint8Array(this.w * this.h);
  }

  reset(): void {
    this.grid.fill(0);
  }

  paint(x: number, y: number, ownerId: number, radius = TRAIL_RADIUS): void {
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

  checkWall(x: number, y: number, radius = TRAIL_RADIUS): boolean {
    return x - radius < 1 || x + radius >= this.w - 1 || y - radius < 1 || y + radius >= this.h - 1;
  }

  checkTrail(x: number, y: number): boolean {
    const cx = Math.round(x);
    const cy = Math.round(y);
    if (cx < 0 || cx >= this.w || cy < 0 || cy >= this.h) return true;
    return this.grid[cy * this.w + cx] !== 0;
  }
}
