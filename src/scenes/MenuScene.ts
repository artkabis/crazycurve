export class MenuScene {
  private readonly el: HTMLDivElement;
  private readonly onEnter: (e: KeyboardEvent) => void;

  constructor(onLocal: () => void, onOnline: () => void) {
    this.el = document.createElement('div');
    this.el.className = 'overlay menu';
    this.el.innerHTML = `
      <h1>CRAZY<span class="accent">CURVE</span></h1>
      <div class="menu-btns">
        <button class="btn-action" id="cc-local">▶ &nbsp;LOCAL (2–6P)</button>
        <button class="btn-action btn-online" id="cc-online">⬡ &nbsp;ONLINE</button>
      </div>
      <p class="hint">Local : press Enter &nbsp;·&nbsp; Online : press O</p>
      <p class="hint" style="margin-top:6px"><span class="hint-key">I</span> toggle negative mode</p>
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
