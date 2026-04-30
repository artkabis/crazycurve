import { ARENA_WIDTH, ARENA_HEIGHT } from '../constants.ts';

let nextId = 1;

export class Missile {
  readonly id:      number;
  readonly ownerId: number;
  x:     number;
  y:     number;
  angle: number;
  alive  = true;

  constructor(
    x: number, y: number, angle: number,
    ownerId: number,
    private readonly speed: number,
  ) {
    this.id      = nextId++;
    this.ownerId = ownerId;
    this.x       = x;
    this.y       = y;
    this.angle   = angle;
  }

  update(): void {
    if (!this.alive) return;
    this.x += Math.cos(this.angle) * this.speed;
    this.y += Math.sin(this.angle) * this.speed;
    if (
      this.x < 2 || this.x >= ARENA_WIDTH  - 2 ||
      this.y < 2 || this.y >= ARENA_HEIGHT - 2
    ) this.alive = false;
  }
}
