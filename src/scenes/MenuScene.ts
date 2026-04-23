export class MenuScene {
  private readonly el: HTMLDivElement;
  private readonly onEnter: (e: KeyboardEvent) => void;

  constructor(onStart: () => void) {
    this.el = document.createElement('div');
    this.el.className = 'overlay menu';
    this.el.innerHTML = `
      <h1>CRAZY<span class="accent">CURVE</span></h1>
      <div class="controls">
        <span style="color:#ff4466"><strong>P1</strong> &nbsp;← →</span>
        <span style="color:#44aaff"><strong>P2</strong> &nbsp;A D</span>
      </div>
      <button class="btn-action" id="cc-start">▶ &nbsp;PLAY</button>
      <p class="hint">or press Enter</p>
    `;

    this.el.querySelector('#cc-start')!.addEventListener('click', onStart);

    this.onEnter = (e: KeyboardEvent) => {
      if (e.key === 'Enter') onStart();
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
