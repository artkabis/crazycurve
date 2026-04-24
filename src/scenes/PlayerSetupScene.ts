import { PLAYER_PALETTE } from '../core/constants.ts';
import type { LocalPlayerSetup } from '../core/constants.ts';

function displayKey(key: string): string {
  const map: Record<string, string> = {
    ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓',
    ' ': 'SPC', Enter: 'ENT', Escape: 'ESC', Backspace: 'BKSP',
    Control: 'CTRL', Shift: 'SFT', Alt: 'ALT', Tab: 'TAB',
  };
  return map[key] ?? (key.length === 1 ? key.toUpperCase() : key);
}

interface ListenState { playerId: number; side: 'left' | 'right'; }

export class PlayerSetupScene {
  private readonly el: HTMLDivElement;
  private playerCount = 2;
  private scoreToWin = 10;
  private readonly setups: LocalPlayerSetup[];
  private listening: ListenState | null = null;

  private readonly onKeyDown: (e: KeyboardEvent) => void;

  constructor(
    onStart: (players: LocalPlayerSetup[], scoreToWin: number) => void,
    onBack: () => void,
  ) {
    this.setups = PLAYER_PALETTE.map((p) => ({
      id: p.id, name: p.name, color: p.color, colorHex: p.colorHex,
      leftKey: p.leftKey, rightKey: p.rightKey,
    }));

    this.el = document.createElement('div');
    this.el.className = 'overlay setup';

    this.onKeyDown = (e: KeyboardEvent) => {
      if (!this.listening) return;
      e.preventDefault();
      e.stopPropagation();
      if (e.key !== 'Escape') {
        const s = this.setups.find((x) => x.id === this.listening!.playerId)!;
        if (this.listening.side === 'left') s.leftKey = e.key;
        else s.rightKey = e.key;
      }
      this.listening = null;
      window.removeEventListener('keydown', this.onKeyDown, { capture: true });
      this.render();
    };

    this.el.addEventListener('click', (e) => {
      const t = e.target as HTMLElement;

      if (t.id === 'cc-setup-start') {
        this.stopListening();
        onStart(this.setups.slice(0, this.playerCount), this.scoreToWin);
        return;
      }
      if (t.id === 'cc-setup-back') {
        this.stopListening();
        onBack();
        return;
      }
      if (t.classList.contains('setup-count-btn')) {
        this.stopListening();
        this.playerCount = parseInt(t.dataset.count!);
        this.render();
        return;
      }
      if (t.classList.contains('setup-score-btn')) {
        this.stopListening();
        this.scoreToWin = parseInt(t.dataset.score!);
        this.render();
        return;
      }
      if (t.classList.contains('setup-key')) {
        this.listening = {
          playerId: parseInt(t.dataset.player!),
          side: t.dataset.side as 'left' | 'right',
        };
        this.render();
        window.addEventListener('keydown', this.onKeyDown, { capture: true });
        return;
      }
    });

    this.render();
  }

  private render(): void {
    const countBtns = [2, 3, 4, 5, 6].map((n) =>
      `<button class="setup-count-btn${n === this.playerCount ? ' active' : ''}" data-count="${n}">${n}</button>`,
    ).join('');

    const scoreBtns = [10, 15, 20, 30].map((n) =>
      `<button class="setup-score-btn${n === this.scoreToWin ? ' active' : ''}" data-score="${n}">${n}</button>`,
    ).join('');

    const playerRows = this.setups.slice(0, this.playerCount).map((s) => {
      const lisL = this.listening?.playerId === s.id && this.listening?.side === 'left';
      const lisR = this.listening?.playerId === s.id && this.listening?.side === 'right';
      return `
        <div class="setup-player-row">
          <span class="setup-dot" style="color:${s.colorHex}">●</span>
          <span class="setup-pname" style="color:${s.colorHex}">${s.name}</span>
          <button class="setup-key${lisL ? ' listening' : ''}" data-player="${s.id}" data-side="left">${lisL ? '…' : displayKey(s.leftKey) || '?'}</button>
          <button class="setup-key${lisR ? ' listening' : ''}" data-player="${s.id}" data-side="right">${lisR ? '…' : displayKey(s.rightKey) || '?'}</button>
        </div>
      `;
    }).join('');

    this.el.innerHTML = `
      <h2 class="setup-title">LOCAL GAME SETUP</h2>
      <div class="setup-section">
        <label class="setup-label">PLAYERS</label>
        <div class="setup-count">${countBtns}</div>
      </div>
      <div class="setup-section">
        <label class="setup-label">CONTROLS &nbsp;<span class="setup-hint">click a key to rebind</span></label>
        <div class="setup-players">${playerRows}</div>
      </div>
      <div class="setup-section">
        <label class="setup-label">SCORE TARGET</label>
        <div class="setup-count">${scoreBtns}</div>
      </div>
      <button class="btn-action" id="cc-setup-start">▶ &nbsp;START GAME</button>
      <button class="btn-back" id="cc-setup-back">← BACK</button>
    `;
  }

  private stopListening(): void {
    if (this.listening) {
      this.listening = null;
      window.removeEventListener('keydown', this.onKeyDown, { capture: true });
    }
  }

  mount(parent: HTMLElement): void {
    parent.appendChild(this.el);
  }

  unmount(): void {
    this.stopListening();
    this.el.remove();
  }
}
