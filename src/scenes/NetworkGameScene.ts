import type { Application } from 'pixi.js';
import type { GameRenderer } from '../renderer/GameRenderer.ts';
import type { TrailLayer } from '../renderer/TrailLayer.ts';
import type { InputManager } from '../input/InputManager.ts';
import type { NetworkManager } from '../network/NetworkManager.ts';
import { NetworkGameState } from '../network/NetworkGameState.ts';
import type { TickPayload } from '../network/protocol.ts';

export class NetworkGameScene {
  private readonly state: NetworkGameState;
  private tickFn: (() => void) | null = null;
  private onGameOver: ((winnerId: number) => void) | null = null;

  constructor(
    private readonly app: Application,
    private readonly network: NetworkManager,
    private readonly input: InputManager,
    private readonly trailLayer: TrailLayer,
    private readonly renderer: GameRenderer,
    playerIds: readonly number[],
    _myPlayerId: number,
  ) {
    this.state = new NetworkGameState(playerIds);
  }

  start(onGameOver: (winnerId: number) => void): void {
    this.onGameOver = onGameOver;
    this.trailLayer.clear();

    this.network.on('tick', this.onTick);

    this.tickFn = () => this.renderTick();
    this.app.ticker.add(this.tickFn);
  }

  stop(): void {
    this.network.off('tick', this.onTick);
    if (this.tickFn) {
      this.app.ticker.remove(this.tickFn);
      this.tickFn = null;
    }
  }

  // Arrow function to preserve `this` when passed as event listener
  private readonly onTick = (payload: TickPayload): void => {
    this.state.applyTick(payload);

    // Clear trails when a new round starts (phase transitions to countdown)
    if (payload.phase === 'countdown' && payload.round > 0 && payload.countdown === 3) {
      this.trailLayer.clear();
    }

    // Detect game over events
    for (const event of payload.events) {
      if (event.type === 'game_over' && this.onGameOver) {
        this.onGameOver(event.winnerId);
      }
    }
  };

  private renderTick(): void {
    // Send local input regardless of who is "myPlayer" — server maps socket→playerId
    const left = this.input.isDown('ArrowLeft');
    const right = this.input.isDown('ArrowRight');
    this.network.sendInput(left, right);

    // Paint trail from last server tick
    this.trailLayer.drawNewPoints(this.state.curves);
    this.state.clearNewPoints();

    this.renderer.renderFrame(this.state);
  }
}
