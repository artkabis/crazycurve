import { Application } from 'pixi.js';
import { ARENA_WIDTH, ARENA_HEIGHT, PLAYER_PALETTE } from './core/constants.ts';
import type { LocalPlayerSetup } from './core/constants.ts';
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
import { PlayerSetupScene } from './scenes/PlayerSetupScene.ts';
import { NetworkManager } from './network/NetworkManager.ts';
import type { PlayerInfo } from './network/protocol.ts';

export class App {
  private pixiApp!: Application;
  private input!: InputManager;
  private trailLayer!: TrailLayer;
  private network!: NetworkManager;
  private audio!: AudioManager;

  private localEngine?: GameEngine;
  private localRenderer?: GameRenderer;
  private localScene?: GameScene;

  private activeOverlay?: { unmount(): void };
  private negativeMode = false;

  async init(container: HTMLElement): Promise<void> {
    this.pixiApp = new Application();
    await this.pixiApp.init({
      width: ARENA_WIDTH,
      height: ARENA_HEIGHT,
      backgroundColor: 0x07070e,
      antialias: false,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    container.prepend(this.pixiApp.canvas);

    this.input = new InputManager();
    this.network = new NetworkManager();
    this.trailLayer = new TrailLayer(this.pixiApp);
    this.audio = new AudioManager();

    document.addEventListener('pointerdown', () => this.audio.unlock(), { once: true });

    // Toggle negative (inverted) colour mode with I key
    window.addEventListener('keydown', (e) => {
      if (e.key === 'i' || e.key === 'I') this.toggleNegativeMode();
    });

    this.showMenu();
  }

  private toggleNegativeMode(): void {
    this.negativeMode = !this.negativeMode;
    const canvas = this.pixiApp.canvas as HTMLCanvasElement;
    canvas.style.filter = this.negativeMode ? 'invert(1)' : '';
  }

  private showMenu(): void {
    this.showOverlay(new MenuScene(
      () => this.showPlayerSetup(),
      () => this.showNameInput(),
    ));
  }

  private showPlayerSetup(): void {
    this.showOverlay(new PlayerSetupScene(
      (players, scoreToWin) => this.startLocal(players, scoreToWin),
      () => this.showMenu(),
    ));
  }

  private startLocal(players: LocalPlayerSetup[], scoreToWin: number): void {
    this.activeOverlay?.unmount();
    this.activeOverlay = undefined;

    // Tear down previous local game — stop ticker, drain listeners, remove PixiJS objects
    this.localScene?.stop();
    this.localEngine?.removeAllListeners();
    this.localRenderer?.destroy();

    const ids = players.map((p) => p.id);
    this.localEngine = new GameEngine(ids, scoreToWin);
    this.localRenderer = new GameRenderer(this.pixiApp, this.trailLayer, ids, scoreToWin);
    this.localScene = new GameScene(
      this.pixiApp, this.localEngine, this.input, this.trailLayer, this.localRenderer, players,
    );

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
      this.localScene!.stop();
      const results: PlayerResult[] = players.map((p) => ({
        id: p.id, name: p.name, colorHex: p.colorHex,
      }));
      const scene = new GameOverScene(winnerId, results, this.localEngine!.scores.getScores(), () => {
        scene.unmount();
        this.showMenu();
      });
      this.showOverlay(scene);
    });

    this.localScene.start();
  }

  // ── Online flow ─────────────────────────────────────────────

  private showNameInput(): void {
    this.showOverlay(new NameInputScene(
      (name, roomId) => this.startOnline(name, roomId),
      () => this.showMenu(),
    ));
  }

  private async startOnline(playerName: string, roomId?: string): Promise<void> {
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
    this.network.join(playerName, roomId);

    // Shared across room_joined + game_start closures for reconnection flow
    let reconnectOverlay: HTMLDivElement | null = null;

    this.network.on('room_joined', (payload) => {
      // Reconnection succeeded — server restored our slot, hide overlay and continue
      if (payload.isReconnect) {
        reconnectOverlay?.remove();
        reconnectOverlay = null;
        return;
      }

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
          reconnectOverlay?.remove();
          reconnectOverlay = null;
          const scene = new GameOverScene(winnerId, players, scores, () => {
            scene.unmount();
            this.network.disconnect();
            this.showMenu();
          });
          this.showOverlay(scene);
        });

        // ── Reconnection overlay (shown only during live game) ──
        this.network.onDisconnect(() => {
          reconnectOverlay = document.createElement('div');
          reconnectOverlay.className = 'overlay reconnecting';
          reconnectOverlay.innerHTML = `
            <div class="reconnecting-box">
              <p class="reconnecting-title">CONNECTION LOST</p>
              <p class="reconnecting-status" id="rc-status">Reconnecting…</p>
            </div>
          `;
          this.getUI().appendChild(reconnectOverlay);
        });

        this.network.onReconnecting((attempt, max) => {
          const el = document.getElementById('rc-status');
          if (el) el.textContent = `Reconnecting… (${attempt}/${max})`;
        });

        this.network.onReconnectFailed(() => {
          const el = document.getElementById('rc-status');
          if (el) el.textContent = 'Connection failed';
          setTimeout(() => {
            netScene.stop();
            reconnectOverlay?.remove();
            reconnectOverlay = null;
            this.network.disconnect();
            this.showMenu();
          }, 2000);
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
