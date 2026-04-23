import type { PowerUpType } from '../types.ts';

let nextPickupId = 1;

export class Pickup {
  readonly id: number;
  collected = false;

  constructor(
    readonly x: number,
    readonly y: number,
    readonly type: PowerUpType,
  ) {
    this.id = nextPickupId++;
  }
}
