export class NameInputScene {
  private readonly el: HTMLDivElement;
  private readonly input: HTMLInputElement;

  constructor(onJoin: (name: string) => void, onCancel: () => void) {
    this.el = document.createElement('div');
    this.el.className = 'overlay name-input';
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
        <button class="btn-action btn-online" id="cc-join">JOIN →</button>
      </div>
      <button class="btn-back" id="cc-back">← BACK</button>
    `;

    this.input = this.el.querySelector<HTMLInputElement>('#cc-name')!;

    const join = (): void => {
      const name = this.input.value.trim() || `Player${Math.floor(Math.random() * 9000) + 1000}`;
      onJoin(name);
    };

    this.el.querySelector('#cc-join')!.addEventListener('click', join);
    this.el.querySelector('#cc-back')!.addEventListener('click', onCancel);
    this.input.addEventListener('keydown', (e) => { if (e.key === 'Enter') join(); });
  }

  mount(parent: HTMLElement): void {
    parent.appendChild(this.el);
    // Small delay so the overlay transition doesn't steal focus
    setTimeout(() => this.input.focus(), 60);
  }

  unmount(): void {
    this.el.remove();
  }
}
