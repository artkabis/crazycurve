import { Application } from 'pixi.js';
import { ARENA_WIDTH, ARENA_HEIGHT, PLAYER_CONFIGS, PLAYER_PALETTE } from './core/constants.ts';
import { GameEngine } from './core/GameEngine.ts';
import { TrailLayer } from './renderer/TrailLayer.ts';
import { GameRenderer } from './renderer/GameRenderer.ts';
import { InputManager } from './input/InputManager.ts';
import { AudioManager } from './audio/AudioManager.ts';
import { GameScene } from './scenes/GameScene.ts';
import { MenuScene } from './scenes/MenuScene.ts';
import { GameOverScene, type PlayerResult } from './scenes/GameOverScene.ts';
import { LobbyScene } from './scenes/LobbyScene.ts';
import { NameInputScene } from './scenes/NameInputScene.ts';
import { NetworkGameScene } from './scenes/NetworkGameScene.ts';
import { NetworkManager } from './network/NetworkManager.ts';
import type { PlayerInfo } from './network/protocol.ts';

export class App {
  private pixiApp!: Application;
  private input!: InputManager;
  private trailLayer!: TrailLayer;
  private network!: NetworkManager;
  private audio!: AudioManager;

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
    this.audio = new AudioManager();

    // Unlock Web Audio on first user gesture anywhere on the page
    document.addEventListener('pointerdown', () => this.audio.unlock(), { once: true });

    // ── Local mode setup ───────────────────────────────────────
    const localIds = PLAYER_CONFIGS.map((p) => p.id);
    this.localEngine = new GameEngine(localIds);
    this.localRenderer = new GameRenderer(this.pixiApp, this.trailLayer, localIds);
    this.localScene = new GameScene(
      this.pixiApp, this.localEngine, this.input, this.trailLayer, this.localRenderer,
    );

    // ── Local audio + visual event wiring ─────────────────────
    this.localEngine.on('phaseChange', (phase) => {
      if (phase === 'countdown') {
        this.trailLayer.clear();
        [0, 1000, 2000].forEach((ms) => setTimeout(() => this.audio.countdown(), ms));
      }
      if (phase === 'playing')    this.audio.go();
      if (phase === 'round_over') this.audio.roundWin();
      if (phase === 'game_over')  this.audio.gameWin();
    });

    this.localEngine.on('playerDied', () => this.audio.die());

    this.localEngine.on('pickup', (type) => {
      if (type === 'eraser') this.audio.erase();
      else if (type === 'shield') this.audio.shield();
      else this.audio.pickup();
    });

    this.localEngine.on('eraseZone', (x, y, r) => this.trailLayer.erase(x, y, r));

    this.localEngine.on('gameOver', (winnerId) => {
      this.localScene.stop();
      const players: PlayerResult[] = PLAYER_CONFIGS.map((p) => ({
        id: p.id, name: p.name, colorHex: p.colorHex,
      }));
      const scene = new GameOverScene(winnerId, players, this.localEngine.scores.getScores(), () => {
        scene.unmount();
        this.showMenu();
      });
      this.showOverlay(scene);
    });

    this.showMenu();
  }

  private showMenu(): void {
    this.showOverlay(new MenuScene(
      () => this.startLocal(),
      () => this.showNameInput(),
    ));
  }

  private startLocal(): void {
    this.activeOverlay?.unmount();
    this.activeOverlay = undefined;
    this.localScene.start();
  }

  // ── Online flow ─────────────────────────────────────────────

  private showNameInput(): void {
    this.showOverlay(new NameInputScene(
      (name) => this.startOnline(name),
      () => this.showMenu(),
    ));
  }

  private async startOnline(playerName: string): Promise<void> {
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
    this.network.join(playerName);

    this.network.on('room_joined', (payload) => {
      const lobby = new LobbyScene(payload.roomId, () => {
        this.network.disconnect();
        lobby.unmount();
        this.showMenu();
      });

      const selfInfo: PlayerInfo = {
        id: payload.yourPlayerId,
        name: playerName,
        color: PLAYER_PALETTE.find((p) => p.id === payload.yourPlayerId)?.color ?? 0xffffff,
        colorHex: PLAYER_PALETTE.find((p) => p.id === payload.yourPlayerId)?.colorHex ?? '#ffffff',
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
          this.pixiApp, this.network, this.input,
          this.trailLayer, netRenderer, this.audio,
          playerIds, payload.yourPlayerId,
        );

        const players: PlayerResult[] = lobbyPlayers.map((p) => ({
          id: p.id, name: p.name, colorHex: p.colorHex,
        }));

        netScene.start((winnerId, scores) => {
          netScene.stop();
          const scene = new GameOverScene(winnerId, players, scores, () => {
            scene.unmount();
            this.network.disconnect();
            this.showMenu();
          });
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
