import { PLAYER_CONFIGS } from '../core/constants.ts';

export class GameOverScene {
  private readonly el: HTMLDivElement;
  private readonly onEnter: (e: KeyboardEvent) => void;

  constructor(winnerId: number, scores: ReadonlyMap<number, number>, onRestart: () => void) {
    const winnerCfg = PLAYER_CONFIGS.find((p) => p.id === winnerId)!;

    const scoresHtml = PLAYER_CONFIGS.map((cfg) => {
      const pts = scores.get(cfg.id) ?? 0;
      const isWinner = cfg.id === winnerId;
      return `<div class="score-row${isWinner ? ' winner' : ''}" style="color:${cfg.colorHex}">${cfg.name} &nbsp;—&nbsp; ${pts} pt${pts !== 1 ? 's' : ''}</div>`;
    }).join('');

    this.el = document.createElement('div');
    this.el.className = 'overlay gameover';
    this.el.innerHTML = `
      <h2 style="color:${winnerCfg.colorHex}">${winnerCfg.name}&nbsp;WINS!</h2>
      <div class="scores">${scoresHtml}</div>
      <button class="btn-action" id="cc-restart">▶ &nbsp;PLAY AGAIN</button>
      <p class="hint">or press Enter</p>
    `;

    this.el.querySelector('#cc-restart')!.addEventListener('click', onRestart);

    this.onEnter = (e: KeyboardEvent) => {
      if (e.key === 'Enter') onRestart();
    };
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
