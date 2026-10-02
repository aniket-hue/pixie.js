export class EventEmitter<M extends Record<string, unknown[]>> {
  private callbacks: { [K in keyof M]?: Array<(...args: M[K]) => void> } = {};

  on<K extends keyof M>(event: K, callback: (...args: M[K]) => void) {
    (this.callbacks[event] ??= []).push(callback);
  }

  off<K extends keyof M>(event: K, callback: (...args: M[K]) => void) {
    this.callbacks[event] = this.callbacks[event]?.filter(
      (cb) => cb !== callback,
    );
  }

  emit<K extends keyof M>(event: K, ...args: M[K]) {
    // A copy, so a listener that unsubscribes while running doesn't make the next one get skipped.
    for (const callback of [...(this.callbacks[event] ?? [])])
      callback(...args);
  }

  destroy() {
    this.callbacks = {};
  }
}
