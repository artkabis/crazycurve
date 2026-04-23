const PREVENT_DEFAULT_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ']);

export class InputManager {
  private readonly pressed = new Set<string>();

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    this.pressed.add(e.key);
    if (PREVENT_DEFAULT_KEYS.has(e.key)) e.preventDefault();
  };

  private readonly onKeyUp = (e: KeyboardEvent): void => {
    this.pressed.delete(e.key);
  };

  constructor() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  isDown(key: string): boolean {
    return this.pressed.has(key);
  }

  destroy(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
  }
}
