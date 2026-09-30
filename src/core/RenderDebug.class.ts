export type RenderDebugFrame = {
  id: number;
  target: 'viewport' | 'export';
  cpuMs: number;
  width: number;
  height: number;
  requests: Array<{ source: string; count: number }>;
  draws: Array<{ instances: number; atlasBin: number | null; reason: string }>;
};

export class RenderDebug {
  frames: RenderDebugFrame[] = [];
  private requests = new Map<string, number>();
  private current: RenderDebugFrame | null = null;
  private startedAt = 0;
  private nextId = 1;

  request(source: string): void {
    this.requests.set(source, (this.requests.get(source) ?? 0) + 1);
  }

  begin(target: RenderDebugFrame['target'], width: number, height: number): void {
    let requests = [{ source: 'Capture.captureRegion', count: 1 }];

    if (target === 'viewport') {
      requests = Array.from(this.requests, ([source, count]) => ({ source, count }));
      this.requests.clear();
    }

    this.current = { id: this.nextId++, target, cpuMs: 0, width, height, requests, draws: [] };
    this.startedAt = performance.now();
  }

  draw(instances: number, atlasBin: number | null, reason: string): void {
    this.current?.draws.push({ instances, atlasBin, reason });
  }

  end(): void {
    if (!this.current) return;

    this.current.cpuMs = performance.now() - this.startedAt;
    this.frames.unshift(this.current);
    this.frames.length = Math.min(this.frames.length, 20);
    this.current = null;
  }
}
