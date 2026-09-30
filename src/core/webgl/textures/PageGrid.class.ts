export const PAGE_SIZE = 2048;
export const SLOT_SIZES = [32, 64, 128, 256] as const;

export type Slot = { page: number; x: number; y: number; size: number };

type Page = { texture: WebGLTexture; size: number; used: number; free: Slot[] };

/** Fixed-size slots on 2048px pages. A page holds one slot size and is deleted once empty, so any size can reuse the memory. */
export class PageGrid {
  private gl: WebGL2RenderingContext;
  private pages: Array<Page | null> = [];

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
  }

  static slotSize(width: number, height: number): number {
    const side = Math.max(width, height);
    const size = SLOT_SIZES.find((candidate) => candidate >= side);

    if (size === undefined) {
      throw new Error(`${width}x${height} is larger than the biggest slot`);
    }

    return size;
  }

  get pageCount(): number {
    return this.pages.filter(Boolean).length;
  }

  /** A free slot on an existing page, or null when every page of this size is full. */
  take(size: number): Slot | null {
    for (const page of this.pages) {
      if (page && page.size === size && page.free.length) {
        page.used++;
        return page.free.pop()!;
      }
    }

    return null;
  }

  addPage(size: number): void {
    const gl = this.gl;
    const texture = gl.createTexture();

    if (!texture) {
      throw new Error('Failed to create a texture page');
    }

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, PAGE_SIZE, PAGE_SIZE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    let index = this.pages.indexOf(null);
    if (index === -1) index = this.pages.length;

    const perRow = PAGE_SIZE / size;
    const free: Slot[] = [];
    for (let i = perRow * perRow - 1; i >= 0; i--) {
      free.push({ page: index, x: (i % perRow) * size, y: Math.floor(i / perRow) * size, size });
    }

    this.pages[index] = { texture, size, used: 0, free };
  }

  release(slot: Slot): void {
    const page = this.pages[slot.page];
    if (!page) return;

    page.used--;
    page.free.push(slot);

    if (page.used === 0) {
      this.gl.deleteTexture(page.texture);
      this.pages[slot.page] = null;
    }
  }

  upload(slot: Slot, bitmap: ImageBitmap): void {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.pages[slot.page]!.texture);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, slot.x, slot.y, gl.RGBA, gl.UNSIGNED_BYTE, bitmap);
  }

  texture(page: number): WebGLTexture | null {
    return this.pages[page]?.texture ?? null;
  }

  stats(): Array<{ page: number; size: number; used: number; capacity: number }> {
    return this.pages.flatMap((page, index) => (page ? [{ page: index, size: page.size, used: page.used, capacity: (PAGE_SIZE / page.size) ** 2 }] : []));
  }

  /** After a context loss the textures are already gone, so forget them without deleting. */
  reset(): void {
    this.pages = [];
  }

  destroy(): void {
    for (const page of this.pages) {
      if (page) this.gl.deleteTexture(page.texture);
    }

    this.pages = [];
  }
}
