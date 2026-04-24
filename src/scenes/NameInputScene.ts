export class NameInputScene {
  private readonly el: HTMLDivElement;
  private step: 1 | 2 = 1;
  private playerName = '';

  constructor(
    private readonly onJoin: (name: string, roomId?: string) => void,
    onBack: () => void,
  ) {
    this.el = document.createElement('div');
    this.el.className = 'overlay name-input';

    this.el.addEventListener('click', (e) => {
      const t = e.target as HTMLElement;
      if (t.id === 'cc-back')         { onBack(); return; }
      if (t.id === 'cc-name-next')    { this.confirmName(); return; }
      if (t.id === 'cc-quick-match')  { this.onJoin(this.playerName); return; }
      if (t.id === 'cc-join-code') {
        const code = (this.el.querySelector<HTMLInputElement>('#cc-room-code')?.value ?? '')
          .trim().toUpperCase();
        if (code) this.onJoin(this.playerName, code);
        return;
      }
    });

    this.render();
  }

  private confirmName(): void {
    const input = this.el.querySelector<HTMLInputElement>('#cc-name');
    this.playerName = (input?.value ?? '').trim()
      || `P${Math.floor(Math.random() * 9000) + 1000}`;
    this.step = 2;
    this.render();
  }

  private render(): void {
    if (this.step === 1) {
      this.el.innerHTML = `
        <h2>ONLINE</h2>
        <div class="name-form">
          <input
            type="text"
            id="cc-name"
            maxlength="16"
            placeholder="Enter your name"
            autocomplete="off"
            spellcheck="false"
          />
          <button class="btn-action btn-online" id="cc-name-next">NEXT →</button>
        </div>
        <button class="btn-back" id="cc-back">← BACK</button>
      `;
      const nameInput = this.el.querySelector<HTMLInputElement>('#cc-name')!;
      setTimeout(() => nameInput.focus(), 60);
      nameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') this.confirmName(); });
    } else {
      this.el.innerHTML = `
        <h2>ONLINE</h2>
        <p class="mode-player-name">${this.playerName}</p>
        <div class="online-modes">
          <button class="btn-action btn-online" id="cc-quick-match">⚡ &nbsp;QUICK MATCH</button>
          <div class="join-code-row">
            <input
              type="text"
              id="cc-room-code"
              maxlength="6"
              placeholder="ROOM CODE"
              autocomplete="off"
              spellcheck="false"
            />
            <button class="btn-action" id="cc-join-code">JOIN →</button>
          </div>
        </div>
        <p class="hint">Share your room code from the lobby to invite friends</p>
        <button class="btn-back" id="cc-back">← BACK</button>
      `;
      const codeInput = this.el.querySelector<HTMLInputElement>('#cc-room-code')!;
      codeInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const code = codeInput.value.trim().toUpperCase();
          if (code) this.onJoin(this.playerName, code);
        }
      });
    }
  }

  mount(parent: HTMLElement): void {
    parent.appendChild(this.el);
  }

  unmount(): void {
    this.el.remove();
  }
}
