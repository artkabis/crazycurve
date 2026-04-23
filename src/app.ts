import { Application } from 'pixi.js';
import { ARENA_WIDTH, ARENA_HEIGHT, PLAYER_CONFIGS } from './core/constants.ts';
import { GameEngine } from './core/GameEngine.ts';
import { TrailLayer } from './renderer/TrailLayer.ts';
import { GameRenderer } from './renderer/GameRenderer.ts';
import { InputManager } from './input/InputManager.ts';
import { GameScene } from './scenes/GameScene.ts';
import { MenuScene } from './scenes/MenuScene.ts';
import { GameOverScene } from './scenes/GameOverScene.ts';
import { LobbyScene } from './scenes/LobbyScene.ts';
import { NetworkGameScene } from './scenes/NetworkGameScene.ts';
import { NetworkManager } from './network/NetworkManager.ts';
import type { PlayerInfo } from './network/protocol.ts';

export class App {
  private pixiApp!: Application;
  private input!: InputManager;
  private trailLayer!: TrailLayer;
  private network!: NetworkManager;

  private localEngine!: GameEngine;
  private localRenderer!: GameRenderer;
  private localScene!: GameScene;

  private activeOverlay?: { unmount(): void };

  async init(container: HTMLElement): Promise<void> {
    this.pixiApp = new Application();
    await this.pixiApp.init({
      width: ARENA_WIDTH,
      height: ARENA_HEIGHT,
      backgroundColor: 0x0a0a0f,
      antialias: false,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    container.prepend(this.pixiApp.canvas);

    this.input = new InputManager();
    this.network = new NetworkManager();
    this.trailLayer = new TrailLayer(this.pixiApp);

    // ── Local mode setup ───────────────────────────────────────
    const localIds = PLAYER_CONFIGS.map((p) => p.id);
    this.localEngine = new GameEngine(localIds);
    this.localRenderer = new GameRenderer(this.pixiApp, this.trailLayer, localIds);
    this.localScene = new GameScene(
      this.pixiApp, this.localEngine, this.input, this.trailLayer, this.localRenderer,
    );

    this.localEngine.on('phaseChange', (phase) => {
      if (phase === 'countdown') this.trailLayer.clear();
    });

    this.localEngine.on('gameOver', (winnerId) => {
      this.localScene.stop();
      const scene = new GameOverScene(winnerId, this.localEngine.scores.getScores(), () => {
        scene.unmount();
        this.showMenu();
      });
      this.showOverlay(scene);
    });

    this.showMenu();
  }

  private showMenu(): void {
    this.showOverlay(
      new MenuScene(
        () => this.startLocal(),
        () => this.startOnline(),
      ),
    );
  }

  private startLocal(): void {
    this.activeOverlay?.unmount();
    this.activeOverlay = undefined;
    this.localScene.start();
  }

  // ── Online flow ─────────────────────────────────────────────

  private async startOnline(): Promise<void> {
    this.activeOverlay?.unmount();

    const connecting = document.createElement('div');
    connecting.className = 'overlay';
    connecting.innerHTML = '<p style="color:#888;letter-spacing:3px">CONNECTING…</p>';
    this.getUI().appendChild(connecting);

    try {
      await this.network.connect();
    } catch {
      connecting.remove();
      alert('Cannot reach the game server. Is it running?');
      this.showMenu();
      return;
    }

    connecting.remove();

    const playerName = `Player${Math.floor(Math.random() * 9000) + 1000}`;
    this.network.join(playerName);

    this.network.on('room_joined', (payload) => {
      const lobby = new LobbyScene(payload.roomId, () => {
        this.network.disconnect();
        lobby.unmount();
        this.showMenu();
      });

      // Add ourselves
      const selfInfo: PlayerInfo = {
        id: payload.yourPlayerId,
        name: playerName,
        color: 0xffffff,
        colorHex: '#ffffff',
      };
      const lobbyPlayers: PlayerInfo[] = [selfInfo];
      lobby.addPlayer(selfInfo);
      this.showOverlay(lobby);

      this.network.on('player_joined', (p) => { lobby.addPlayer(p); lobbyPlayers.push(p); });
      this.network.on('player_left', (id) => lobby.removePlayer(id));

      this.network.on('game_start', () => {
        lobby.unmount();
        this.activeOverlay = undefined;

        const playerIds = lobbyPlayers.map((p) => p.id);
        const netRenderer = new GameRenderer(this.pixiApp, this.trailLayer, playerIds);
        const netScene = new NetworkGameScene(
          this.pixiApp, this.network, this.input, this.trailLayer, netRenderer,
          playerIds, payload.yourPlayerId,
        );

        netScene.start((winnerId) => {
          netScene.stop();
          const scene = new GameOverScene(
            winnerId,
            new Map(), // scores come from final tick
            () => { scene.unmount(); this.network.disconnect(); this.showMenu(); },
          );
          this.showOverlay(scene);
        });
      });
    });

    this.network.on('error', (msg) => {
      alert(`Server error: ${msg}`);
      this.network.disconnect();
      this.showMenu();
    });
  }

  private showOverlay(scene: { mount(el: HTMLElement): void; unmount(): void }): void {
    this.activeOverlay?.unmount();
    this.activeOverlay = scene;
    scene.mount(this.getUI());
  }

  private getUI(): HTMLElement {
    return document.getElementById('ui') ?? document.body;
  }
}
