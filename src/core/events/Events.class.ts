export class EventEmitter {
  callbacks: Record<string, Array<(...args: any[]) => void>> = {};
  constructor() {
    this.callbacks = {};
  }

  on(event: string, callback: (...args: any[]) => void) {
    this.callbacks[event] = this.callbacks[event] || [];
    this.callbacks[event].push(callback);
  }

  off(event: string, callback: (...args: any[]) => void) {
    this.callbacks[event] = this.callbacks[event] || [];
    this.callbacks[event] = this.callbacks[event].filter((cb) => cb !== callback);
  }

  emit(event: string, ...args: any[]) {
    this.callbacks[event] = this.callbacks[event] || [];

    this.callbacks[event].forEach((callback) => callback(...args));
  }

  destroy() {
    this.callbacks = {};
  }
}
