import { PLAYER_PALETTE } from '../core/constants.ts';

export interface PlayerResult {
  id: number;
  name: string;
  colorHex: string;
}

export class GameOverScene {
  private readonly el: HTMLDivElement;
  private readonly onEnter: (e: KeyboardEvent) => void;

  constructor(
    winnerId: number,
    players: readonly PlayerResult[],
    scores: ReadonlyMap<number, number>,
    onRestart: () => void,
  ) {
    const winner = players.find((p) => p.id === winnerId)
      ?? { id: winnerId, name: `P${winnerId}`, colorHex: PLAYER_PALETTE.find((p) => p.id === winnerId)?.colorHex ?? '#ffffff' };

    // Sort by score descending, winner always first on tie
    const sorted = [...players].sort((a, b) => {
      const sa = scores.get(a.id) ?? 0;
      const sb = scores.get(b.id) ?? 0;
      if (sb !== sa) return sb - sa;
      return a.id === winnerId ? -1 : 1;
    });

    const rows = sorted.map((p) => {
      const pts = scores.get(p.id) ?? 0;
      const isWinner = p.id === winnerId;
      const crown = isWinner ? '👑 ' : '';
      return `
        <div class="score-row${isWinner ? ' winner' : ''}" style="color:${p.colorHex}">
          ${crown}<span class="score-name">${p.name}</span>
          <span class="score-pts">${pts} pt${pts !== 1 ? 's' : ''}</span>
        </div>`;
    }).join('');

    this.el = document.createElement('div');
    this.el.className = 'overlay gameover';
    this.el.innerHTML = `
      <h2 style="color:${winner.colorHex}">${winner.name}&nbsp;WINS!</h2>
      <div class="scores">${rows}</div>
      <button class="btn-action" id="cc-restart">▶ &nbsp;PLAY AGAIN</button>
      <p class="hint">or press Enter</p>
    `;

    this.el.querySelector('#cc-restart')!.addEventListener('click', onRestart);

    this.onEnter = (e: KeyboardEvent) => { if (e.key === 'Enter') onRestart(); };
    window.addEventListener('keydown', this.onEnter);
  }

  mount(parent: HTMLElement): void {
    parent.appendChild(this.el);
  }

  unmount(): void {
    window.removeEventListener('keydown', this.onEnter);
    this.el.remove();
  }
}
