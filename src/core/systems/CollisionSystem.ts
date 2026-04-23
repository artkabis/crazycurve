import { ARENA_WIDTH, ARENA_HEIGHT, TRAIL_RADIUS } from '../constants.ts';

/**
 * Bitmap-based O(1) collision detection.
 * A Uint8Array mirrors the arena pixel-by-pixel: 0 = empty, N = player ID.
 * Painting and checking are both constant-time regardless of trail length.
 */
export class CollisionSystem {
  private readonly grid: Uint8Array;
  private readonly w = ARENA_WIDTH;
  private readonly h = ARENA_HEIGHT;
  private readonly r = Math.ceil(TRAIL_RADIUS);

  constructor() {
    this.grid = new Uint8Array(this.w * this.h);
  }

  reset(): void {
    this.grid.fill(0);
  }

  paint(x: number, y: number, ownerId: number): void {
    const cx = Math.round(x);
    const cy = Math.round(y);
    for (let dy = -this.r; dy <= this.r; dy++) {
      for (let dx = -this.r; dx <= this.r; dx++) {
        if (dx * dx + dy * dy <= TRAIL_RADIUS * TRAIL_RADIUS) {
          const px = cx + dx;
          const py = cy + dy;
          if (px >= 0 && px < this.w && py >= 0 && py < this.h) {
            this.grid[py * this.w + px] = ownerId;
          }
        }
      }
    }
  }

  checkWall(x: number, y: number): boolean {
    return x - this.r < 1 || x + this.r >= this.w - 1 || y - this.r < 1 || y + this.r >= this.h - 1;
  }

  checkTrail(x: number, y: number): boolean {
    const cx = Math.round(x);
    const cy = Math.round(y);
    if (cx < 0 || cx >= this.w || cy < 0 || cy >= this.h) return true;
    return this.grid[cy * this.w + cx] !== 0;
  }
}
