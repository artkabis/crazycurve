type EventMap = Record<string, unknown[]>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Handler = (...args: any[]) => void;

export class TypedEventEmitter<TEvents extends EventMap> {
  private readonly listeners = new Map<keyof TEvents, Set<Handler>>();

  on<K extends keyof TEvents>(event: K, listener: (...args: TEvents[K]) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    const set = this.listeners.get(event)!;
    set.add(listener as Handler);
    return () => set.delete(listener as Handler);
  }

  emit<K extends keyof TEvents>(event: K, ...args: TEvents[K]): void {
    this.listeners.get(event)?.forEach((fn) => fn(...args));
  }

  off<K extends keyof TEvents>(event: K, listener: (...args: TEvents[K]) => void): void {
    this.listeners.get(event)?.delete(listener as Handler);
  }

  removeAllListeners(): void {
    this.listeners.clear();
  }
}
