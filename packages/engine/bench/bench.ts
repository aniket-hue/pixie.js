import { MaxRectsPacker } from 'maxrects-packer';

const W = 1920;
const H = 1080;
const WARMUP = 5;
const FRAMES = 60;
const FLOATS = 10;
const MAX_INSTANCES = 65_536;
const ATLAS = 4096;
const PAGE = 2048;
const TILE = 256;
const CHURN_PER_FRAME = 100;

type Img = { id: number; src: ImageBitmap; w: number; h: number };
type Item = { x: number; y: number; w: number; h: number; img: Img };
type Camera = { s: number; ox: number; oy: number };
type Scene = { items: Item[]; camera: Camera; churn: boolean };
type UV = [number, number, number, number];

export type Row = {
  scene: string;
  strategy: string;
  prepareMs?: number;
  gpuMB?: number;
  draws?: number;
  cpuMs?: number;
  gpuMs?: number;
  gpuP95?: number;
  wallMs?: number;
  note?: string;
  error?: string;
  shot?: string;
};

interface Strategy {
  name: string;
  prepare(items: Item[], camera: Camera, churn: boolean): Promise<void>;
  frame(items: Item[], camera: Camera): void;
  add(item: Item): void;
  remove(item: Item): void;
  bytes(): number;
  note?(): string;
}

// ---------- scene data ----------

let nextImageId = 1;
const range = (n: number) => Array.from({ length: n }, (_, i) => i);
const image = (src: ImageBitmap): Img => ({ id: nextImageId++, src, w: src.width, h: src.height });
const place = (x: number, y: number, img: Img): Item => ({ x, y, w: img.w, h: img.h, img });

async function bitmap(w: number, h: number, hue: number, kind: 'icon' | 'photo'): Promise<ImageBitmap> {
  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createLinearGradient(0, 0, w, h);
  gradient.addColorStop(0, `hsl(${hue} 85% 60%)`);
  gradient.addColorStop(1, `hsl(${(hue + 90) % 360} 85% 25%)`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);

  if (kind === 'icon') {
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, w * 0.3, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = Math.max(2, w / 500);
    for (let x = 0; x < w; x += 128) ctx.strokeRect(x, 0, 0, h);
    for (let y = 0; y < h; y += 128) ctx.strokeRect(0, y, w, 0);
  }

  return createImageBitmap(canvas);
}

type Pools = { icon: ImageBitmap[]; photo: ImageBitmap[]; churn: ImageBitmap[]; huge: ImageBitmap };

async function makePools(): Promise<Pools> {
  return {
    icon: await Promise.all(range(64).map((i) => bitmap(32, 32, (i * 37) % 360, 'icon'))),
    photo: await Promise.all(range(8).map((i) => bitmap(1920, 1280, i * 45, 'photo'))),
    churn: await Promise.all(range(32).map((i) => bitmap(128, 128, (i * 23) % 360, 'icon'))),
    huge: await bitmap(12000, 8000, 200, 'photo'),
  };
}

function fit(worldW: number, worldH: number): Camera {
  const s = Math.min(W / worldW, H / worldH) * 0.95;
  return { s, ox: (W - worldW * s) / 2, oy: (H - worldH * s) / 2 };
}

const centeredAt = (x: number, y: number): Camera => ({ s: 1, ox: W / 2 - x, oy: H / 2 - y });

function sceneDefs(pools: Pools): Array<{ name: string; build: () => Scene }> {
  const icons = (n: number, cols: number, spacingX: number, spacingY = spacingX) =>
    range(n).map((i) => place((i % cols) * spacingX, Math.floor(i / cols) * spacingY, image(pools.icon[i % pools.icon.length])));
  const photos = () => range(100).map((i) => place((i % 10) * 2000, Math.floor(i / 10) * 1360, image(pools.photo[i % pools.photo.length])));
  const photoWorld = fit(9 * 2000 + 1920, 9 * 1360 + 1280);

  return [
    { name: 'icons 10k', build: () => ({ items: icons(10_000, 100, 40), camera: fit(99 * 40 + 32, 99 * 40 + 32), churn: false }) },
    { name: 'photos out', build: () => ({ items: photos(), camera: photoWorld, churn: false }) },
    { name: 'photos in', build: () => ({ items: photos(), camera: centeredAt(4 * 2000 + 960, 4 * 1360 + 640), churn: false }) },
    { name: 'mixed', build: () => ({ items: [...photos(), ...icons(5000, 100, 200, 272)], camera: photoWorld, churn: false }) },
    {
      name: 'churn',
      build: () => ({
        items: range(2000).map((i) => place((i % 50) * 150, Math.floor(i / 50) * 150, image(pools.churn[i % pools.churn.length]))),
        camera: fit(49 * 150 + 128, 39 * 150 + 128),
        churn: true,
      }),
    },
    { name: 'huge fit', build: () => ({ items: [place(0, 0, image(pools.huge))], camera: fit(12000, 8000), churn: false }) },
    { name: 'huge 1:1', build: () => ({ items: [place(0, 0, image(pools.huge))], camera: centeredAt(6000, 4000), churn: false }) },
  ];
}

function onScreen(x: number, y: number, w: number, h: number, c: Camera): boolean {
  const sx = x * c.s + c.ox;
  const sy = y * c.s + c.oy;
  return sx < W && sy < H && sx + w * c.s > 0 && sy + h * c.s > 0;
}

// ---------- GL plumbing shared by every strategy ----------

const VS = `#version 300 es
in vec2 a_pos;
in vec4 a_rect;
in vec4 a_uv;
in vec2 a_tex;
uniform vec3 u_cam;
uniform vec2 u_res;
out vec2 v_uv;
flat out vec2 v_tex;
void main() {
  vec2 screen = (a_rect.xy + a_pos * a_rect.zw) * u_cam.x + u_cam.yz;
  vec2 clip = screen / u_res * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
  v_uv = mix(a_uv.xy, a_uv.zw, a_pos + 0.5);
  v_tex = a_tex;
}`;

const FS_HEAD = `#version 300 es
precision highp float;
precision highp sampler2DArray;
in vec2 v_uv;
flat in vec2 v_tex;
out vec4 o;
`;

const FS_2D = `${FS_HEAD}uniform sampler2D u_t0;
void main() { o = texture(u_t0, v_uv); }`;

const FS_ARRAY = `${FS_HEAD}uniform sampler2DArray u_arr;
void main() { o = texture(u_arr, vec3(v_uv, v_tex.y)); }`;

// GLSL ES 3.0 only allows constant sampler-array indices, hence the generated if-chain.
const samplerChain = (n: number) =>
  range(n)
    .map((i) => `${i ? 'else ' : ''}if (i == ${i}) o = texture(u_t[${i}], v_uv);`)
    .join('\n  ');

const FS_MULTI = `${FS_HEAD}uniform sampler2D u_t[16];
void main() {
  int i = int(v_tex.x + 0.5);
  ${samplerChain(16)}
}`;

const FS_HYBRID = `${FS_HEAD}uniform sampler2DArray u_arr;
uniform sampler2D u_t[15];
void main() {
  if (v_tex.x < 0.0) { o = texture(u_arr, vec3(v_uv, v_tex.y)); return; }
  int i = int(v_tex.x + 0.5);
  ${samplerChain(15)}
}`;

class Gl {
  canvas = document.createElement('canvas');
  gl: WebGL2RenderingContext;
  draws = 0;
  private data = new Float32Array(MAX_INSTANCES * FLOATS);
  private count = 0;
  private instanceBuffer: WebGLBuffer;
  private timer: any;
  private program: WebGLProgram | null = null;

  constructor() {
    this.canvas.width = W;
    this.canvas.height = H;
    const gl = this.canvas.getContext('webgl2', { antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
    if (!gl) throw new Error('WebGL2 unavailable');
    this.gl = gl;
    this.timer = gl.getExtension('EXT_disjoint_timer_query_webgl2');

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, 0.5]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    this.instanceBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.data.byteLength, gl.DYNAMIC_DRAW);
    const attributes: Array<[number, number, number]> = [
      [1, 4, 0],
      [2, 4, 16],
      [3, 2, 32],
    ];
    for (const [location, size, offset] of attributes) {
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, size, gl.FLOAT, false, FLOATS * 4, offset);
      gl.vertexAttribDivisor(location, 1);
    }
  }

  makeProgram(fs: string, samplers: Record<string, number | number[]>): WebGLProgram {
    const gl = this.gl;
    const program = gl.createProgram()!;

    for (const [type, source] of [
      [gl.VERTEX_SHADER, VS],
      [gl.FRAGMENT_SHADER, fs],
    ] as const) {
      const shader = gl.createShader(type)!;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? 'shader failed');
      gl.attachShader(program, shader);
    }

    ['a_pos', 'a_rect', 'a_uv', 'a_tex'].forEach((name, location) => gl.bindAttribLocation(program, location, name));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? 'link failed');

    gl.useProgram(program);
    for (const [name, value] of Object.entries(samplers)) {
      const location = gl.getUniformLocation(program, name);
      if (Array.isArray(value)) gl.uniform1iv(location, value);
      else gl.uniform1i(location, value);
    }

    return program;
  }

  begin(program: WebGLProgram, camera: Camera): void {
    const gl = this.gl;
    this.program = program;
    this.draws = 0;
    this.count = 0;
    gl.viewport(0, 0, W, H);
    gl.clearColor(0.07, 0.07, 0.08, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    gl.uniform3f(gl.getUniformLocation(program, 'u_cam'), camera.s, camera.ox, camera.oy);
    gl.uniform2f(gl.getUniformLocation(program, 'u_res'), W, H);
  }

  push(x: number, y: number, w: number, h: number, uv: UV, tex: number, layer: number): void {
    if (this.count === MAX_INSTANCES) this.flush();
    const o = this.count++ * FLOATS;
    const d = this.data;
    d[o] = x + w / 2;
    d[o + 1] = y + h / 2;
    d[o + 2] = w;
    d[o + 3] = h;
    d[o + 4] = uv[0];
    d[o + 5] = uv[1];
    d[o + 6] = uv[2];
    d[o + 7] = uv[3];
    d[o + 8] = tex;
    d[o + 9] = layer;
  }

  flush(): void {
    if (!this.count || !this.program) return;
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.data, 0, this.count * FLOATS);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.count);
    this.draws++;
    this.count = 0;
  }

  /** readPixels blocks until every queued command, uploads included, has finished. */
  sync(): void {
    this.gl.readPixels(0, 0, 1, 1, this.gl.RGBA, this.gl.UNSIGNED_BYTE, new Uint8Array(4));
  }

  beginQuery(): WebGLQuery | null {
    if (!this.timer) return null;
    const query = this.gl.createQuery()!;
    this.gl.beginQuery(this.timer.TIME_ELAPSED_EXT, query);
    return query;
  }

  endQuery(): void {
    if (this.timer) this.gl.endQuery(this.timer.TIME_ELAPSED_EXT);
  }

  async readQueries(queries: Array<WebGLQuery | null>): Promise<number[]> {
    const gl = this.gl;
    const results: number[] = [];

    for (const query of queries) {
      if (!query) continue;
      // Query results only become available after control returns to the event loop.
      for (let i = 0; i < 200 && !gl.getQueryParameter(query, gl.QUERY_RESULT_AVAILABLE); i++) await sleep(2);
      if (!gl.getParameter(this.timer.GPU_DISJOINT_EXT)) results.push(gl.getQueryParameter(query, gl.QUERY_RESULT) / 1e6);
      gl.deleteQuery(query);
    }

    return results;
  }

  screenshot(): string {
    const small = document.createElement('canvas');
    small.width = 480;
    small.height = 270;
    small.getContext('2d')!.drawImage(this.canvas, 0, 0, 480, 270);
    return small.toDataURL('image/jpeg', 0.85);
  }

  destroy(): void {
    this.gl.getExtension('WEBGL_lose_context')?.loseContext();
  }
}

function texture2D(gl: WebGL2RenderingContext, w: number, h: number, levels: number): WebGLTexture {
  const texture = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texStorage2D(gl.TEXTURE_2D, levels, gl.RGBA8, w, h);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, levels > 1 ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
  return texture;
}

const FULL_UV: UV = [0, 0, 1, 1];

// ---------- A: maxrects atlas, the engine today ----------

class AtlasStrategy implements Strategy {
  name = 'A maxrects atlas';
  private program: WebGLProgram;
  private pages: WebGLTexture[] = [];
  private packer = AtlasStrategy.packer();
  private entries = new Map<number, { page: number; uv: UV; area: number }>();
  private live = new Map<number, Img>();
  private liveArea = 0;
  private freedArea = 0;
  private repacks = 0;

  constructor(private r: Gl) {
    this.program = r.makeProgram(FS_2D, { u_t0: 0 });
  }

  private static packer() {
    return new MaxRectsPacker(ATLAS, ATLAS, 2, { smart: true, pot: false, square: false, allowRotation: false });
  }

  private pack(img: Img): void {
    if (img.w > ATLAS || img.h > ATLAS) throw new Error(`${img.w}x${img.h} does not fit the ${ATLAS} atlas`);

    const gl = this.r.gl;
    const rect = this.packer.add(img.w, img.h, img.id);
    const page = this.packer.bins.findIndex((bin) => bin.rects.includes(rect));

    this.pages[page] ??= texture2D(gl, ATLAS, ATLAS, 1);
    gl.bindTexture(gl.TEXTURE_2D, this.pages[page]);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, rect.x, rect.y, gl.RGBA, gl.UNSIGNED_BYTE, img.src);

    this.entries.set(img.id, { page, uv: [rect.x / ATLAS, rect.y / ATLAS, (rect.x + img.w) / ATLAS, (rect.y + img.h) / ATLAS], area: img.w * img.h });
  }

  async prepare(items: Item[]): Promise<void> {
    for (const item of items) this.add(item);
  }

  add(item: Item): void {
    this.pack(item.img);
    this.live.set(item.img.id, item.img);
    this.liveArea += item.w * item.h;
  }

  remove(item: Item): void {
    const entry = this.entries.get(item.img.id)!;
    this.entries.delete(item.img.id);
    this.live.delete(item.img.id);
    this.liveArea -= entry.area;
    this.freedArea += entry.area;

    if (this.freedArea >= this.liveArea) {
      this.pages.forEach((page) => this.r.gl.deleteTexture(page));
      this.pages = [];
      this.packer = AtlasStrategy.packer();
      this.entries.clear();
      for (const img of this.live.values()) this.pack(img);
      this.freedArea = 0;
      this.repacks++;
    }
  }

  frame(items: Item[], camera: Camera): void {
    const r = this.r;
    const byPage: Item[][] = [];

    for (const item of items) {
      if (onScreen(item.x, item.y, item.w, item.h, camera)) (byPage[this.entries.get(item.img.id)!.page] ??= []).push(item);
    }

    r.begin(this.program, camera);
    byPage.forEach((list, page) => {
      r.gl.bindTexture(r.gl.TEXTURE_2D, this.pages[page]);
      for (const item of list) r.push(item.x, item.y, item.w, item.h, this.entries.get(item.img.id)!.uv, 0, 0);
      r.flush();
    });
  }

  bytes(): number {
    return this.pages.filter(Boolean).length * ATLAS * ATLAS * 4;
  }

  note(): string {
    return this.repacks ? `${this.repacks} repacks` : '';
  }
}

// ---------- shared by B and C: one texture per image, with mips ----------

class PerImageTextures {
  private textures = new Map<number, { texture: WebGLTexture; bytes: number }>();
  private units = new Map<WebGLTexture, number>();

  constructor(
    private r: Gl,
    private unitCount: number,
    private firstUnit: number,
  ) {}

  add(img: Img): void {
    const gl = this.r.gl;
    const levels = Math.floor(Math.log2(Math.max(img.w, img.h))) + 1;
    const texture = texture2D(gl, img.w, img.h, levels);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, img.src);
    gl.generateMipmap(gl.TEXTURE_2D);
    this.textures.set(img.id, { texture, bytes: (img.w * img.h * 4 * 4) / 3 });
  }

  remove(img: Img): void {
    this.r.gl.deleteTexture(this.textures.get(img.id)!.texture);
    this.textures.delete(img.id);
  }

  /** Binds the image to a free unit, flushing first when every unit is taken. */
  unitFor(img: Img): number {
    const texture = this.textures.get(img.id)!.texture;
    let unit = this.units.get(texture);

    if (unit === undefined) {
      if (this.units.size === this.unitCount) this.endBatch();
      unit = this.units.size;
      this.units.set(texture, unit);
      this.r.gl.activeTexture(this.r.gl.TEXTURE0 + this.firstUnit + unit);
      this.r.gl.bindTexture(this.r.gl.TEXTURE_2D, texture);
    }

    return unit;
  }

  endBatch(): void {
    this.r.flush();
    this.units.clear();
  }

  bytes(): number {
    let total = 0;
    for (const { bytes } of this.textures.values()) total += bytes;
    return total;
  }
}

class PerImageStrategy implements Strategy {
  name = 'B per-image + mips';
  private program: WebGLProgram;
  private textures: PerImageTextures;

  constructor(private r: Gl) {
    this.program = r.makeProgram(FS_MULTI, { 'u_t[0]': range(16) });
    this.textures = new PerImageTextures(r, 16, 0);
  }

  async prepare(items: Item[]): Promise<void> {
    for (const item of items) this.add(item);
  }

  add(item: Item): void {
    this.textures.add(item.img);
  }

  remove(item: Item): void {
    this.textures.remove(item.img);
  }

  frame(items: Item[], camera: Camera): void {
    this.r.begin(this.program, camera);
    for (const item of items) {
      if (onScreen(item.x, item.y, item.w, item.h, camera)) this.r.push(item.x, item.y, item.w, item.h, FULL_UV, this.textures.unitFor(item.img), 0);
    }
    this.textures.endBatch();
    this.r.gl.activeTexture(this.r.gl.TEXTURE0);
  }

  bytes(): number {
    return this.textures.bytes();
  }
}

// ---------- shared by C and D: fixed-size slots in one texture array ----------

type Slot = { layer: number; x: number; y: number; size: number };

const slotSize = (w: number, h: number) => Math.max(32, 2 ** Math.ceil(Math.log2(Math.max(w, h))));

abstract class SlotGrid {
  private free = new Map<number, Slot[]>();
  protected layerCount = 0;

  protected abstract newLayer(layer: number): void;
  abstract upload(slot: Slot, src: ImageBitmap): UV;
  abstract bytes(): number;

  /** Layers needed for these slot sizes, plus spare layers per size so churn never runs out. */
  static layersFor(sizes: number[], spare: number): number {
    const counts = new Map<number, number>();
    for (const size of sizes) counts.set(size, (counts.get(size) ?? 0) + 1);

    let layers = 0;
    for (const [size, count] of counts) layers += Math.ceil(count / (PAGE / size) ** 2) + spare;
    return layers;
  }

  alloc(size: number): Slot {
    let list = this.free.get(size);

    if (!list?.length) {
      const layer = this.layerCount++;
      this.newLayer(layer);
      const perRow = PAGE / size;
      list = list ?? [];
      for (let i = 0; i < perRow * perRow; i++) list.push({ layer, x: (i % perRow) * size, y: Math.floor(i / perRow) * size, size });
      this.free.set(size, list);
    }

    return list.pop()!;
  }

  release(slot: Slot): void {
    this.free.get(slot.size)!.push(slot);
  }

  protected uv(slot: Slot, src: ImageBitmap): UV {
    return [slot.x / PAGE, slot.y / PAGE, (slot.x + src.width) / PAGE, (slot.y + src.height) / PAGE];
  }
}

/** All pages are layers of one TEXTURE_2D_ARRAY, so any mix of pages draws in one call. */
class GridArray extends SlotGrid {
  texture: WebGLTexture;

  constructor(
    private gl: WebGL2RenderingContext,
    private capacity: number,
  ) {
    super();
    this.texture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.texture);
    gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 1, gl.RGBA8, PAGE, PAGE, Math.max(1, capacity));
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  protected newLayer(layer: number): void {
    if (layer >= this.capacity) throw new Error('texture array is full');
  }

  upload(slot: Slot, src: ImageBitmap): UV {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.texture);
    gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, slot.x, slot.y, slot.layer, src.width, src.height, 1, gl.RGBA, gl.UNSIGNED_BYTE, src);
    return this.uv(slot, src);
  }

  bytes(): number {
    return this.capacity * PAGE * PAGE * 4;
  }
}

/** One TEXTURE_2D per page. Chrome uploads ImageBitmaps into 2D textures far faster than into arrays. */
class GridPages extends SlotGrid {
  textures: WebGLTexture[] = [];

  constructor(private gl: WebGL2RenderingContext) {
    super();
  }

  protected newLayer(layer: number): void {
    this.textures[layer] = texture2D(this.gl, PAGE, PAGE, 1);
  }

  upload(slot: Slot, src: ImageBitmap): UV {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.textures[slot.layer]);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, slot.x, slot.y, gl.RGBA, gl.UNSIGNED_BYTE, src);
    return this.uv(slot, src);
  }

  bytes(): number {
    return this.textures.length * PAGE * PAGE * 4;
  }
}

// ---------- C: small images in the grid array, large ones as their own texture ----------

class TwoTierStrategy implements Strategy {
  name = 'C two-tier';
  private program: WebGLProgram;
  private grid: GridArray | null = null;
  private small = new Map<number, { slot: Slot; uv: UV }>();
  private large: PerImageTextures;

  constructor(private r: Gl) {
    this.program = r.makeProgram(FS_HYBRID, { u_arr: 0, 'u_t[0]': range(15).map((i) => i + 1) });
    this.large = new PerImageTextures(r, 15, 1);
  }

  private static isSmall(img: Img) {
    return img.w <= TILE && img.h <= TILE;
  }

  async prepare(items: Item[], _camera: Camera, churn: boolean): Promise<void> {
    const sizes = items.filter((item) => TwoTierStrategy.isSmall(item.img)).map((item) => slotSize(item.w, item.h));
    if (sizes.length) this.grid = new GridArray(this.r.gl, SlotGrid.layersFor(sizes, churn ? 1 : 0));
    for (const item of items) this.add(item);
  }

  add(item: Item): void {
    if (!TwoTierStrategy.isSmall(item.img)) {
      this.large.add(item.img);
      return;
    }

    const slot = this.grid!.alloc(slotSize(item.w, item.h));
    this.small.set(item.img.id, { slot, uv: this.grid!.upload(slot, item.img.src) });
  }

  remove(item: Item): void {
    const entry = this.small.get(item.img.id);

    if (entry) {
      this.grid!.release(entry.slot);
      this.small.delete(item.img.id);
    } else {
      this.large.remove(item.img);
    }
  }

  frame(items: Item[], camera: Camera): void {
    const r = this.r;
    r.begin(this.program, camera);
    r.gl.activeTexture(r.gl.TEXTURE0);
    if (this.grid) r.gl.bindTexture(r.gl.TEXTURE_2D_ARRAY, this.grid.texture);

    for (const item of items) {
      if (!onScreen(item.x, item.y, item.w, item.h, camera)) continue;

      const entry = this.small.get(item.img.id);
      if (entry) r.push(item.x, item.y, item.w, item.h, entry.uv, -1, entry.slot.layer);
      else r.push(item.x, item.y, item.w, item.h, FULL_UV, this.large.unitFor(item.img), 0);
    }

    this.large.endBatch();
    r.gl.activeTexture(r.gl.TEXTURE0);
  }

  bytes(): number {
    return (this.grid?.bytes() ?? 0) + this.large.bytes();
  }
}

// ---------- D: everything as 256px tiles of an LOD pyramid, in one texture array ----------

type Chunk = { key: string; item: Item; sx: number; sy: number; sw: number; sh: number; dw: number; dh: number };

class TiledStrategy implements Strategy {
  name: string;
  private program: WebGLProgram;
  private grid: GridArray | GridPages | null = null;
  private resident = new Map<string, { slot: Slot; uv: UV }>();
  private units = new Map<number, number>();
  private missing = 0;

  constructor(
    private r: Gl,
    private pages2D: boolean,
  ) {
    this.name = pages2D ? 'E tiles + LOD, 2D pages' : 'D tiles + LOD, array';
    this.program = pages2D ? r.makeProgram(FS_MULTI, { 'u_t[0]': range(16) }) : r.makeProgram(FS_ARRAY, { u_arr: 0 });
  }

  /** Array: the layer is the index. 2D pages: bind the page to a unit, flushing when all 16 are taken. */
  private texIndex(layer: number): number {
    if (!(this.grid instanceof GridPages)) return 0;

    let unit = this.units.get(layer);
    if (unit === undefined) {
      if (this.units.size === 16) {
        this.r.flush();
        this.units.clear();
      }
      unit = this.units.size;
      this.units.set(layer, unit);
      this.r.gl.activeTexture(this.r.gl.TEXTURE0 + unit);
      this.r.gl.bindTexture(this.r.gl.TEXTURE_2D, this.grid.textures[layer]);
    }

    return unit;
  }

  /** The visible pieces at the camera's LOD: sx..sh is the source region, dw/dh the uploaded size. */
  private chunks(items: Item[], camera: Camera): Chunk[] {
    const level = Math.max(0, Math.floor(Math.log2(1 / camera.s)));
    const f = 2 ** level;
    const out: Chunk[] = [];

    for (const item of items) {
      if (!onScreen(item.x, item.y, item.w, item.h, camera)) continue;

      if (item.w <= TILE && item.h <= TILE) {
        out.push({ key: `${item.img.id}`, item, sx: 0, sy: 0, sw: item.w, sh: item.h, dw: item.w, dh: item.h });
        continue;
      }

      const lw = Math.ceil(item.w / f);
      const lh = Math.ceil(item.h / f);

      if (lw <= TILE && lh <= TILE) {
        out.push({ key: `${item.img.id}@${level}`, item, sx: 0, sy: 0, sw: item.w, sh: item.h, dw: lw, dh: lh });
        continue;
      }

      for (let ty = 0; ty * TILE < lh; ty++) {
        for (let tx = 0; tx * TILE < lw; tx++) {
          const sx = tx * TILE * f;
          const sy = ty * TILE * f;
          const sw = Math.min(TILE * f, item.w - sx);
          const sh = Math.min(TILE * f, item.h - sy);

          if (onScreen(item.x + sx, item.y + sy, sw, sh, camera)) {
            out.push({ key: `${item.img.id}@${level}:${tx},${ty}`, item, sx, sy, sw, sh, dw: Math.ceil(sw / f), dh: Math.ceil(sh / f) });
          }
        }
      }
    }

    return out;
  }

  private static bitmapFor(chunk: Chunk): Promise<ImageBitmap> | ImageBitmap {
    const src = chunk.item.img.src;
    const whole = chunk.sw === src.width && chunk.sh === src.height && chunk.dw === src.width && chunk.dh === src.height;
    if (whole) return src;

    return createImageBitmap(src, chunk.sx, chunk.sy, chunk.sw, chunk.sh, { resizeWidth: chunk.dw, resizeHeight: chunk.dh, resizeQuality: 'medium' });
  }

  async prepare(items: Item[], camera: Camera, churn: boolean): Promise<void> {
    const needed = this.chunks(items, camera);
    this.grid = this.pages2D
      ? new GridPages(this.r.gl)
      : new GridArray(this.r.gl, SlotGrid.layersFor(needed.map((c) => slotSize(c.dw, c.dh)), churn ? 1 : 0));

    for (let i = 0; i < needed.length; i += 64) {
      const batch = needed.slice(i, i + 64);
      const bitmaps = await Promise.all(batch.map((chunk) => TiledStrategy.bitmapFor(chunk)));

      batch.forEach((chunk, j) => {
        const slot = this.grid!.alloc(slotSize(chunk.dw, chunk.dh));
        this.resident.set(chunk.key, { slot, uv: this.grid!.upload(slot, bitmaps[j]) });
        if (bitmaps[j] !== chunk.item.img.src) bitmaps[j].close();
      });
    }
  }

  add(item: Item): void {
    const slot = this.grid!.alloc(slotSize(item.w, item.h));
    this.resident.set(`${item.img.id}`, { slot, uv: this.grid!.upload(slot, item.img.src) });
  }

  remove(item: Item): void {
    const key = `${item.img.id}`;
    this.grid!.release(this.resident.get(key)!.slot);
    this.resident.delete(key);
  }

  frame(items: Item[], camera: Camera): void {
    const r = this.r;
    r.begin(this.program, camera);
    r.gl.activeTexture(r.gl.TEXTURE0);
    if (this.grid instanceof GridArray) r.gl.bindTexture(r.gl.TEXTURE_2D_ARRAY, this.grid.texture);

    for (const chunk of this.chunks(items, camera)) {
      const entry = this.resident.get(chunk.key);
      if (!entry) {
        this.missing++;
        continue;
      }
      r.push(chunk.item.x + chunk.sx, chunk.item.y + chunk.sy, chunk.sw, chunk.sh, entry.uv, this.texIndex(entry.slot.layer), entry.slot.layer);
    }

    r.flush();
    this.units.clear();
    r.gl.activeTexture(r.gl.TEXTURE0);
  }

  bytes(): number {
    return this.grid?.bytes() ?? 0;
  }

  note(): string {
    return `${this.resident.size} chunks${this.missing ? `, ${this.missing} missing` : ''}`;
  }
}

// ---------- runner ----------

const STRATEGIES: Array<(r: Gl) => Strategy> = [
  (r) => new AtlasStrategy(r),
  (r) => new PerImageStrategy(r),
  (r) => new TwoTierStrategy(r),
  (r) => new TiledStrategy(r, false),
  (r) => new TiledStrategy(r, true),
];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function percentile(values: number[], p: number): number {
  if (!values.length) return Number.NaN;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
}

function churnStep(scene: Scene, strategy: Strategy, pools: Pools, frame: number): void {
  for (let i = 0; i < CHURN_PER_FRAME; i++) {
    const index = (frame * 7919 + i * 104_729) % scene.items.length;
    const old = scene.items[index];
    strategy.remove(old);

    const next = place(old.x, old.y, image(pools.churn[(frame + i) % pools.churn.length]));
    strategy.add(next);
    scene.items[index] = next;
  }
}

async function runOne(name: string, scene: Scene, makeStrategy: (r: Gl) => Strategy, pools: Pools): Promise<Row> {
  const r = new Gl();
  const row: Row = { scene: name, strategy: '' };

  try {
    const strategy = makeStrategy(r);
    row.strategy = strategy.name;

    const start = performance.now();
    await strategy.prepare(scene.items, scene.camera, scene.churn);
    r.sync();
    row.prepareMs = performance.now() - start;

    const error = r.gl.getError();
    if (r.gl.isContextLost()) throw new Error('context lost');
    if (error) throw new Error(`GL error 0x${error.toString(16)}`);

    const cpu: number[] = [];
    const wall: number[] = [];
    const queries: Array<WebGLQuery | null> = [];

    for (let frame = 0; frame < WARMUP + FRAMES; frame++) {
      const t0 = performance.now();
      if (scene.churn) churnStep(scene, strategy, pools, frame);
      const query = r.beginQuery();
      strategy.frame(scene.items, scene.camera);
      r.endQuery();
      const t1 = performance.now();
      r.sync();
      const t2 = performance.now();

      if (frame >= WARMUP) {
        cpu.push(t1 - t0);
        wall.push(t2 - t0);
        queries.push(query);
      } else if (query) {
        r.gl.deleteQuery(query);
      }
    }

    const gpu = await r.readQueries(queries);
    Object.assign(row, {
      draws: r.draws,
      cpuMs: percentile(cpu, 0.5),
      gpuMs: percentile(gpu, 0.5),
      gpuP95: percentile(gpu, 0.95),
      wallMs: percentile(wall, 0.5),
      gpuMB: strategy.bytes() / 2 ** 20,
      note: strategy.note?.() ?? '',
      shot: r.screenshot(),
    });
  } catch (error) {
    row.error = error instanceof Error ? error.message : String(error);
  } finally {
    r.destroy();
    await sleep(100);
  }

  return row;
}

async function runBench(): Promise<{ renderer: string; rows: Row[] }> {
  const probe = document.createElement('canvas').getContext('webgl2')!;
  const info = probe.getExtension('WEBGL_debug_renderer_info');
  const renderer = info ? probe.getParameter(info.UNMASKED_RENDERER_WEBGL) : 'unknown';
  probe.getExtension('WEBGL_lose_context')?.loseContext();

  console.log(`[bench] ${renderer}`);
  const pools = await makePools();
  const rows: Row[] = [];

  for (const def of sceneDefs(pools)) {
    for (const makeStrategy of STRATEGIES) {
      const row = await runOne(def.name, def.build(), makeStrategy, pools);
      console.log(`[bench] ${def.name} / ${row.strategy}: ${row.error ?? `${row.wallMs?.toFixed(2)} ms wall`}`);
      rows.push(row);
    }
  }

  return { renderer, rows };
}

declare global {
  interface Window {
    runBench: typeof runBench;
  }
}

window.runBench = runBench;

document.getElementById('run')?.addEventListener('click', async () => {
  const out = document.getElementById('out')!;
  out.textContent = 'Running...';
  const { renderer, rows } = await runBench();
  out.textContent = `${renderer}\n\n${JSON.stringify(
    rows.map(({ shot, ...rest }) => rest),
    null,
    2,
  )}`;
});
