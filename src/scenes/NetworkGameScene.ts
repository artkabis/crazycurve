import type { Application } from 'pixi.js';
import type { GameRenderer } from '../renderer/GameRenderer.ts';
import type { TrailLayer } from '../renderer/TrailLayer.ts';
import type { InputManager } from '../input/InputManager.ts';
import type { NetworkManager } from '../network/NetworkManager.ts';
import type { AudioManager } from '../audio/AudioManager.ts';
import { NetworkGameState } from '../network/NetworkGameState.ts';
import type { TickPayload, NetGameEvent } from '../network/protocol.ts';
import type { GamePhase } from '../core/types.ts';

export class NetworkGameScene {
  private readonly state: NetworkGameState;
  private tickFn: (() => void) | null = null;
  private onGameOver: ((winnerId: number, scores: Map<number, number>) => void) | null = null;
  private prevPhase: GamePhase | '' = '';

  constructor(
    private readonly app: Application,
    private readonly network: NetworkManager,
    private readonly input: InputManager,
    private readonly trailLayer: TrailLayer,
    private readonly renderer: GameRenderer,
    private readonly audio: AudioManager,
    playerIds: readonly number[],
    _myPlayerId: number,
  ) {
    this.state = new NetworkGameState(playerIds);
  }

  start(onGameOver: (winnerId: number, scores: Map<number, number>) => void): void {
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

  private readonly onTick = (payload: TickPayload): void => {
    this.state.applyTick(payload);

    if (payload.phase !== this.prevPhase) {
      if (payload.phase === 'countdown') {
        [0, 1000, 2000].forEach((ms) => setTimeout(() => this.audio.countdown(), ms));
      }
      if (payload.phase === 'playing')    this.audio.go();
      if (payload.phase === 'round_over') this.audio.roundWin();
      if (payload.phase === 'game_over')  this.audio.gameWin();
      this.prevPhase = payload.phase;
    }

    if (payload.phase === 'countdown' && payload.round > 0 && payload.countdown === 3) {
      this.trailLayer.clear();
    }

    for (const event of payload.events) {
      this.handleEvent(event);
    }
  };

  private handleEvent(event: NetGameEvent): void {
    if (event.type === 'game_over') {
      this.onGameOver?.(event.winnerId, this.state.getScoresMap());
    }
    if (event.type === 'player_died') {
      this.audio.die();
    }
    if (event.type === 'erase_zone') {
      this.trailLayer.erase(event.x, event.y, event.radius);
      this.audio.erase();
    }
    if (event.type === 'missile_hit') {
      this.audio.missileHit();
    }
  }

  private renderTick(): void {
    const left = this.input.isDown('ArrowLeft');
    const right = this.input.isDown('ArrowRight');
    this.network.sendInput(left, right);

    this.trailLayer.drawNewPoints(this.state.curves);
    this.state.clearNewPoints();

    this.renderer.renderFrame(this.state);
  }
}
