export class MenuScene {
  private readonly el: HTMLDivElement;
  private readonly onEnter: (e: KeyboardEvent) => void;

  constructor(onLocal: () => void, onOnline: () => void) {
    this.el = document.createElement('div');
    this.el.className = 'overlay menu';
    this.el.innerHTML = `
      <h1>CRAZY<span class="accent">CURVE</span></h1>
      <div class="controls">
        <span style="color:#ff4466"><strong>P1</strong> &nbsp;← →</span>
        <span style="color:#44aaff"><strong>P2</strong> &nbsp;A D</span>
      </div>
      <div class="menu-btns">
        <button class="btn-action" id="cc-local">▶ &nbsp;LOCAL (2P)</button>
        <button class="btn-action btn-online" id="cc-online">⬡ &nbsp;ONLINE</button>
      </div>
      <p class="hint">Local : press Enter &nbsp;·&nbsp; Online : click or O</p>
    `;

    this.el.querySelector('#cc-local')!.addEventListener('click', onLocal);
    this.el.querySelector('#cc-online')!.addEventListener('click', onOnline);

    this.onEnter = (e: KeyboardEvent) => {
      if (e.key === 'Enter') onLocal();
      if (e.key === 'o' || e.key === 'O') onOnline();
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
