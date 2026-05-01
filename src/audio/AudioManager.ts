export class AudioManager {
  private ctx: AudioContext | null = null;

  unlock(): void {
    if (this.ctx) return;
    this.ctx = new AudioContext();
  }

  private tone(freq: number, dur: number, vol = 0.2, type: OscillatorType = 'sine'): void {
    if (!this.ctx || this.ctx.state === 'suspended') return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + dur);
  }

  countdown(): void {
    this.tone(523, 0.07, 0.18, 'square');
  }

  go(): void {
    this.tone(784, 0.08, 0.22, 'square');
    setTimeout(() => this.tone(1047, 0.14, 0.22, 'square'), 80);
  }

  die(): void {
    this.tone(110, 0.35, 0.35, 'sawtooth');
  }

  pickup(): void {
    this.tone(660, 0.05, 0.14);
    setTimeout(() => this.tone(880, 0.08, 0.12), 55);
  }

  shield(): void {
    this.tone(880, 0.04, 0.12);
    setTimeout(() => this.tone(1047, 0.1, 0.14), 45);
  }

  shieldBreak(): void {
    this.tone(440, 0.05, 0.2, 'square');
    setTimeout(() => this.tone(220, 0.15, 0.2, 'sawtooth'), 50);
  }

  erase(): void {
    this.tone(300, 0.08, 0.18, 'square');
    setTimeout(() => this.tone(200, 0.12, 0.14, 'square'), 70);
  }

  missileHit(): void {
    this.tone(880, 0.04, 0.28, 'square');
    setTimeout(() => this.tone(440, 0.15, 0.22, 'sawtooth'), 40);
  }

  roundWin(): void {
    [523, 659, 784].forEach((f, i) => setTimeout(() => this.tone(f, 0.18, 0.22), i * 100));
  }

  gameWin(): void {
    [523, 659, 784, 1047].forEach((f, i) =>
      setTimeout(() => this.tone(f, 0.22, 0.28), i * 130),
    );
  }
}
