import type { TextureData } from '../ecs/base/components/TextureComponent.class';
import { PAGE_SIZE, PageGrid, type Slot } from './textures/PageGrid.class';

export type TextureLoad = { url: string; width: number; height: number; fetchDecodeMs: number; thumbMs?: number; error?: string };

/** u, v, width, height inside a page, in 0..1. */
export type UV = [number, number, number, number];

/** Part of an image in 0..1, y down. */
export type Region = { x0: number; y0: number; x1: number; y1: number };

export type ResolvedTexture = { page: number; uv: UV };

type Source = { url: string; blob: Blob; width: number; height: number; thumbLevel: number; failures: number; load: TextureLoad };

type Chunk = { key: string; url: string; slot: Slot; uv: UV; region: Region; lastUsed: number; pinned: boolean };

type Job = { key: string; url: string; level: number; tx: number; ty: number; pinned: boolean; lastRequested: number };

type LevelBitmap = { promise: Promise<ImageBitmap>; bitmap: ImageBitmap | null; bytes: number; lastUsed: number; users: number };

const SLOT = 256;
// Tiles overlap by 1px on each side so bilinear filtering never samples a neighbouring slot.
const TILE = SLOT - 2;
const THUMB_MAX = 128;
const MAX_JOBS = 6;
const STALE_FRAMES = 2;
const MAX_FAILURES = 3;
const LEVEL_CACHE_BYTES = 256 * 2 ** 20;
const LOAD_LOG_SIZE = 50;
const TIMING_LOG_SIZE = 100;
const FULL: Region = { x0: 0, y0: 0, x1: 1, y1: 1 };

const levelSize = (source: Source, level: number) => ({ w: Math.ceil(source.width / 2 ** level), h: Math.ceil(source.height / 2 ** level) });
const isSingle = (w: number, h: number) => w <= SLOT && h <= SLOT;
const keyOf = (url: string, level: number, tx: number, ty: number) => `${url}@${level}:${tx},${ty}`;

function covers(outer: Region, inner: Region) {
  const e = 1e-9;
  return outer.x0 <= inner.x0 + e && outer.y0 <= inner.y0 + e && outer.x1 >= inner.x1 - e && outer.y1 >= inner.y1 - e;
}

function subUV(chunk: Chunk, r: Region): UV {
  const [u, v, w, h] = chunk.uv;
  const { region } = chunk;
  const sx = w / (region.x1 - region.x0);
  const sy = h / (region.y1 - region.y0);
  return [u + (r.x0 - region.x0) * sx, v + (r.y0 - region.y0) * sy, (r.x1 - r.x0) * sx, (r.y1 - r.y0) * sy];
}

function percentile(values: number[], p: number) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
}

/**
 * Streams images to the GPU as 256px tiles at the level of detail they are drawn at.
 * Only visible tiles are uploaded, and least-recently-drawn tiles are evicted once the page budget is reached.
 */
export class TextureManager {
  /** Called when a tile lands, so the canvas can redraw. */
  onChunk: (() => void) | null = null;
  /** Keeps off-screen requests alive while an export waits for its tiles. */
  keepStaleRequests = false;
  pageBudget = 16;

  private gl: WebGL2RenderingContext | null = null;
  private grid: PageGrid | null = null;
  private sources = new Map<string, Source>();
  private loading = new Map<string, Promise<TextureData>>();
  private chunks = new Map<string, Chunk>();
  private jobs = new Map<string, Job>();
  private queue: Job[] = [];
  private running = 0;
  private generation = 0;
  private frame = 0;
  private missing = 0;
  private levels = new Map<string, LevelBitmap>();
  private idleWaiters: Array<() => void> = [];

  private failed = 0;
  private evictions = 0;
  private overBudget = 0;
  private loads: TextureLoad[] = [];
  private chunkTimes: number[] = [];

  initialize(gl: WebGL2RenderingContext): void {
    if (this.gl === gl && this.grid) {
      return;
    }

    this.gl = gl;
    this.grid = new PageGrid(gl);
  }

  // ---------- loading ----------

  loadTexture(url: string): Promise<TextureData> {
    const source = this.sources.get(url);
    if (source) {
      return Promise.resolve({ url, width: source.width, height: source.height, loaded: true });
    }

    const pending = this.loading.get(url);
    if (pending) {
      return pending;
    }

    const started = performance.now();

    const loading = (async () => {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);

      const blob = await response.blob();
      const full = await createImageBitmap(blob);
      const load: TextureLoad = { url, width: full.width, height: full.height, fetchDecodeMs: performance.now() - started };
      const thumbLevel = Math.max(0, Math.ceil(Math.log2(Math.max(full.width, full.height) / THUMB_MAX)));
      const source: Source = { url, blob, width: full.width, height: full.height, thumbLevel, failures: 0, load };

      this.sources.set(url, source);
      this.cacheLevel(source, 0, full);
      this.logLoad(load);
      this.request(url, thumbLevel, -1, -1, true);
      this.pump();

      return { url, width: full.width, height: full.height, loaded: true };
    })()
      .catch((error: unknown) => {
        this.failed++;
        this.logLoad({ url, width: 0, height: 0, fetchDecodeMs: performance.now() - started, error: error instanceof Error ? error.message : String(error) });
        throw error;
      })
      .finally(() => {
        this.loading.delete(url);
      });

    this.loading.set(url, loading);
    return loading;
  }

  private logLoad(load: TextureLoad): void {
    this.loads.unshift(load);
    this.loads.length = Math.min(this.loads.length, LOAD_LOG_SIZE);
  }

  // ---------- what the renderer asks for ----------

  beginFrame(): void {
    this.frame++;
    this.missing = 0;
  }

  /** Starts queued uploads. Returns how many tiles this frame drew from a coarser level or not at all. */
  endFrame(): number {
    this.pump();
    return this.missing;
  }

  /** The finest level that still has at least one texel per device pixel, or null when the image is not loaded. */
  levelFor(url: string, screenWidth: number, screenHeight: number): number | null {
    const source = this.sources.get(url);
    if (!source) return null;

    const ratio = Math.min(source.width / screenWidth, source.height / screenHeight);
    if (!(ratio > 1)) return 0;

    return Math.min(source.thumbLevel, Math.floor(Math.log2(ratio)));
  }

  /** Tile grid of a level. A level that fits one slot is a single chunk, addressed as tile -1, -1. */
  tileGrid(url: string, level: number): { single: boolean; cols: number; rows: number } {
    const { w, h } = levelSize(this.sources.get(url)!, level);
    if (isSingle(w, h)) return { single: true, cols: 1, rows: 1 };
    return { single: false, cols: Math.ceil(w / TILE), rows: Math.ceil(h / TILE) };
  }

  region(url: string, level: number, tx: number, ty: number): Region {
    if (tx < 0) return FULL;

    const { w, h } = levelSize(this.sources.get(url)!, level);
    return { x0: (tx * TILE) / w, y0: (ty * TILE) / h, x1: Math.min((tx + 1) * TILE, w) / w, y1: Math.min((ty + 1) * TILE, h) / h };
  }

  /** The exact tile when resident, otherwise the closest coarser tile that covers the region. Missing tiles are queued. */
  resolve(url: string, level: number, tx: number, ty: number, region: Region): ResolvedTexture | null {
    const source = this.sources.get(url);
    if (!source || source.failures >= MAX_FAILURES) return null;

    const exact = this.chunks.get(keyOf(url, level, tx, ty));
    if (exact) return this.use(exact, region);

    this.missing++;
    this.request(url, level, tx, ty, level === source.thumbLevel);

    for (let coarser = level + 1; coarser <= source.thumbLevel; coarser++) {
      const chunk = this.chunks.get(this.keyAt(source, coarser, region));
      if (chunk && covers(chunk.region, region)) return this.use(chunk, region);
    }

    this.request(url, source.thumbLevel, -1, -1, true);
    return null;
  }

  pageTexture(page: number): WebGLTexture | null {
    return this.grid?.texture(page) ?? null;
  }

  private use(chunk: Chunk, region: Region): ResolvedTexture {
    chunk.lastUsed = this.frame;
    return { page: chunk.slot.page, uv: subUV(chunk, region) };
  }

  private keyAt(source: Source, level: number, region: Region): string {
    const { w, h } = levelSize(source, level);
    if (isSingle(w, h)) return keyOf(source.url, level, -1, -1);

    const tx = Math.floor((((region.x0 + region.x1) / 2) * w) / TILE);
    const ty = Math.floor((((region.y0 + region.y1) / 2) * h) / TILE);
    return keyOf(source.url, level, tx, ty);
  }

  // ---------- streaming ----------

  private request(url: string, level: number, tx: number, ty: number, pinned: boolean): void {
    const key = keyOf(url, level, tx, ty);
    if (this.chunks.has(key)) return;

    const existing = this.jobs.get(key);
    if (existing) {
      existing.lastRequested = this.frame;
      existing.pinned ||= pinned;
      return;
    }

    const job: Job = { key, url, level, tx, ty, pinned, lastRequested: this.frame };
    this.jobs.set(key, job);
    this.queue.push(job);
  }

  private pump(): void {
    while (this.running < MAX_JOBS && this.queue.length) {
      const job = this.queue.shift()!;
      const stale = !job.pinned && !this.keepStaleRequests && job.lastRequested < this.frame - STALE_FRAMES;

      if (stale || !this.sources.has(job.url)) {
        this.jobs.delete(job.key);
        continue;
      }

      this.running++;
      this.run(job)
        .catch((error: unknown) => {
          const source = this.sources.get(job.url);
          if (source) source.failures++;
          console.error(error);
        })
        .finally(() => {
          this.running--;
          this.jobs.delete(job.key);
          this.pump();
        });
    }

    this.notifyIdle();
  }

  private async run(job: Job): Promise<void> {
    const source = this.sources.get(job.url)!;
    const generation = this.generation;
    const started = performance.now();

    const { w, h } = levelSize(source, job.level);
    const single = job.tx < 0;
    const cx0 = single ? 0 : job.tx * TILE;
    const cy0 = single ? 0 : job.ty * TILE;
    const cx1 = single ? w : Math.min(cx0 + TILE, w);
    const cy1 = single ? h : Math.min(cy0 + TILE, h);
    const bx0 = Math.max(0, cx0 - 1);
    const by0 = Math.max(0, cy0 - 1);
    const bx1 = Math.min(w, cx1 + 1);
    const by1 = Math.min(h, cy1 + 1);

    const level = await this.levelBitmap(source, job.level);
    let bitmap: ImageBitmap;
    try {
      bitmap = single ? level.bitmap! : await createImageBitmap(level.bitmap!, bx0, by0, bx1 - bx0, by1 - by0);
    } finally {
      level.users--;
    }

    const owned = bitmap !== level.bitmap;
    const discard = generation !== this.generation || !this.sources.has(job.url) || this.chunks.has(job.key) || !this.gl || this.gl.isContextLost();

    if (discard) {
      if (owned) bitmap.close();
      return;
    }

    const slot = this.allocate(PageGrid.slotSize(bitmap.width, bitmap.height));
    this.grid!.upload(slot, bitmap);
    if (owned) bitmap.close();

    // Image edges have no overlap to sample from, so pull them in by half a texel instead.
    const half = 0.5;
    const u0 = slot.x + (cx0 - bx0) + (cx0 === 0 ? half : 0);
    const v0 = slot.y + (cy0 - by0) + (cy0 === 0 ? half : 0);
    const u1 = slot.x + (cx1 - bx0) - (cx1 === w ? half : 0);
    const v1 = slot.y + (cy1 - by0) - (cy1 === h ? half : 0);

    this.chunks.set(job.key, {
      key: job.key,
      url: job.url,
      slot,
      uv: [u0 / PAGE_SIZE, v0 / PAGE_SIZE, (u1 - u0) / PAGE_SIZE, (v1 - v0) / PAGE_SIZE],
      region: single ? FULL : { x0: cx0 / w, y0: cy0 / h, x1: cx1 / w, y1: cy1 / h },
      lastUsed: this.frame,
      pinned: job.pinned,
    });

    this.chunkTimes.unshift(performance.now() - started);
    this.chunkTimes.length = Math.min(this.chunkTimes.length, TIMING_LOG_SIZE);

    if (single && job.level === source.thumbLevel && source.load.thumbMs === undefined) {
      source.load.thumbMs = source.load.fetchDecodeMs + performance.now() - started;
    }

    this.onChunk?.();
  }

  private allocate(size: number): Slot {
    const grid = this.grid!;
    const fresh = () => {
      grid.addPage(size);
      return grid.take(size)!;
    };

    const slot = grid.take(size);
    if (slot) return slot;
    if (grid.pageCount < this.pageBudget) return fresh();

    const candidates = [...this.chunks.values()].filter((chunk) => !chunk.pinned && chunk.lastUsed < this.frame).sort((a, b) => a.lastUsed - b.lastUsed);

    for (const chunk of candidates) {
      this.evict(chunk);

      const reused = grid.take(size);
      if (reused) return reused;
      if (grid.pageCount < this.pageBudget) return fresh();
    }

    // ponytail: soft budget; going over beats drawing holes when the visible tiles alone exceed it.
    this.overBudget++;
    return fresh();
  }

  private evict(chunk: Chunk): void {
    this.chunks.delete(chunk.key);
    this.grid!.release(chunk.slot);
    this.evictions++;
  }

  // ---------- decoded levels, kept on the CPU so tiles are crops instead of fresh decodes ----------

  /** Resolves with users already incremented; the caller decrements when done with the bitmap. */
  private levelBitmap(source: Source, level: number): Promise<LevelBitmap> {
    const key = `${source.url}@${level}`;
    let entry = this.levels.get(key);

    if (!entry) {
      const { w, h } = levelSize(source, level);
      const created: LevelBitmap = { promise: Promise.resolve() as unknown as Promise<ImageBitmap>, bitmap: null, bytes: w * h * 4, lastUsed: 0, users: 0 };

      created.promise = this.decodeLevel(source, level, w, h).then(
        (bitmap) => {
          created.bitmap = bitmap;
          this.trimLevels();
          return bitmap;
        },
        (error: unknown) => {
          this.levels.delete(key);
          throw error;
        },
      );

      this.levels.set(key, created);
      entry = created;
    }

    const ready = entry;
    ready.lastUsed = performance.now();
    ready.users++;

    return ready.promise.then(
      () => ready,
      (error: unknown) => {
        ready.users--;
        throw error;
      },
    );
  }

  /** Resizing an already decoded finer level is much cheaper than decoding the file again. */
  private async decodeLevel(source: Source, level: number, w: number, h: number): Promise<ImageBitmap> {
    for (let finer = level - 1; finer >= 0; finer--) {
      const cached = this.levels.get(`${source.url}@${finer}`);
      if (!cached?.bitmap) continue;

      cached.users++;
      try {
        return await createImageBitmap(cached.bitmap, { resizeWidth: w, resizeHeight: h, resizeQuality: 'high' });
      } finally {
        cached.users--;
      }
    }

    return createImageBitmap(source.blob, { resizeWidth: w, resizeHeight: h, resizeQuality: 'high' });
  }

  private cacheLevel(source: Source, level: number, bitmap: ImageBitmap): void {
    const entry: LevelBitmap = { promise: Promise.resolve(bitmap), bitmap, bytes: bitmap.width * bitmap.height * 4, lastUsed: performance.now(), users: 0 };
    this.levels.set(`${source.url}@${level}`, entry);
    this.trimLevels();
  }

  private trimLevels(): void {
    let total = 0;
    for (const entry of this.levels.values()) {
      if (entry.bitmap) total += entry.bytes;
    }

    const idle = [...this.levels.entries()].filter(([, entry]) => entry.bitmap && !entry.users).sort(([, a], [, b]) => a.lastUsed - b.lastUsed);

    for (const [key, entry] of idle) {
      if (total <= LEVEL_CACHE_BYTES) break;

      entry.bitmap!.close();
      this.levels.delete(key);
      total -= entry.bytes;
    }
  }

  // ---------- lifecycle ----------

  /** Resolves once nothing is queued or in flight. */
  whenIdle(): Promise<void> {
    if (!this.running && !this.queue.length) return Promise.resolve();
    return new Promise((resolve) => this.idleWaiters.push(resolve));
  }

  private notifyIdle(): void {
    if (this.running || this.queue.length) return;

    const waiters = this.idleWaiters;
    this.idleWaiters = [];
    for (const resolve of waiters) resolve();
  }

  /** Drops every image no live entity uses. */
  collect(liveUrls: Set<string>): void {
    for (const url of [...this.sources.keys()]) {
      if (liveUrls.has(url)) continue;

      this.sources.delete(url);

      for (const chunk of [...this.chunks.values()]) {
        if (chunk.url === url) {
          this.chunks.delete(chunk.key);
          this.grid!.release(chunk.slot);
        }
      }

      for (const [key, entry] of [...this.levels.entries()]) {
        if (key.startsWith(`${url}@`) && !entry.users) {
          entry.bitmap?.close();
          this.levels.delete(key);
        }
      }
    }
  }

  /** GPU pages from before a context loss are gone. Sources and decoded levels survive, so visible tiles simply stream back. */
  restore(): void {
    this.generation++;
    this.grid?.reset();
    this.chunks.clear();
    this.jobs.clear();
    this.queue = [];
  }

  cleanup(): void {
    this.generation++;
    this.grid?.destroy();
    this.grid = null;

    for (const entry of this.levels.values()) entry.bitmap?.close();
    this.levels.clear();

    this.sources.clear();
    this.loading.clear();
    this.chunks.clear();
    this.jobs.clear();
    this.queue = [];
    this.gl = null;
    this.notifyIdle();
  }

  // ---------- debug ----------

  stats() {
    let pinned = 0;
    for (const chunk of this.chunks.values()) {
      if (chunk.pinned) pinned++;
    }

    let cpuBytes = 0;
    for (const entry of this.levels.values()) {
      if (entry.bitmap) cpuBytes += entry.bytes;
    }

    const pages = this.grid?.pageCount ?? 0;

    return {
      images: this.sources.size,
      loading: this.loading.size,
      failed: this.failed,
      pages,
      pageBudget: this.pageBudget,
      gpuBytes: pages * PAGE_SIZE * PAGE_SIZE * 4,
      cpuBytes,
      chunks: this.chunks.size,
      pinned,
      queued: this.queue.length + this.running,
      evictions: this.evictions,
      overBudget: this.overBudget,
      chunkP50: percentile(this.chunkTimes, 0.5),
      chunkP95: percentile(this.chunkTimes, 0.95),
    };
  }

  pageStats() {
    return this.grid?.stats() ?? [];
  }

  recentLoads(): readonly TextureLoad[] {
    return this.loads;
  }
}
