import type { BoundingBox } from './types';
import type { Camera } from './Camera.class';
import type { Canvas } from './Canvas.class';
import type { Entity } from './ecs/base/Entity.class';
import type { World } from './ecs/World.class';
import { argbToRgba } from './lib/color';
import { m3 } from './lib/math';
import type { GlCore } from './webgl/GlCore.class';
import { type ResolvedTexture, TextureManager, type UV } from './webgl/TextureManager.class';

type Attribute = { name: string; size: number; data: Float32Array; buffer: WebGLBuffer | null; location: number };

/** shape: plain rectangle. image: textured quad, no stroke. stroke: stroke drawn over an image. */
type Mode = 'shape' | 'image' | 'stroke';

const MAX_INSTANCES = 20_000;
// WebGL2 guarantees at least 16 texture units in the fragment shader.
const PAGE_UNITS = 16;
const FULL_UV: UV = [0, 0, 1, 1];
const TRANSPARENT: [number, number, number, number] = [0, 0, 0, 0];

export class SceneRenderer {
  public textureManager: TextureManager;

  private gl: GlCore;
  private camera: Camera;
  private canvas: Canvas;

  private quad = new Float32Array([-0.5, -0.5, 0.5, -0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5]);
  private quadBuffer: WebGLBuffer | null = null;
  private positionLocation = -1;

  private attributes: Attribute[];
  private matrices: Float32Array;
  private sizes: Float32Array;
  private fills: Float32Array;
  private strokes: Float32Array;
  private strokeWidths: Float32Array;
  private hasTextures: Float32Array;
  private uvs: Float32Array;
  private filters1: Float32Array;
  private filters2: Float32Array;
  private pages: Float32Array;

  private count = 0;
  private units = new Map<number, number>();

  constructor(context: Canvas) {
    this.gl = context.getGlCore();
    this.camera = context.camera;
    this.canvas = context;

    this.textureManager = new TextureManager();
    this.textureManager.initialize(this.gl.ctx);
    this.textureManager.onChunk = () => context.requestRender('Texture tile ready');

    const attribute = (name: string, size: number): Attribute => ({ name, size, data: new Float32Array(MAX_INSTANCES * size), buffer: null, location: -1 });

    this.attributes = [
      attribute('a_instance_matrix', 9),
      attribute('a_instance_size', 2),
      attribute('a_instance_fill_color', 4),
      attribute('a_instance_stroke_color', 4),
      attribute('a_instance_stroke_width', 1),
      attribute('a_instance_has_texture', 1),
      attribute('a_instance_uv', 4),
      attribute('a_instance_filters1', 4),
      attribute('a_instance_filters2', 2),
      attribute('a_instance_page', 1),
    ];

    [this.matrices, this.sizes, this.fills, this.strokes, this.strokeWidths, this.hasTextures, this.uvs, this.filters1, this.filters2, this.pages] = this.attributes.map(
      (item) => item.data,
    );

    this.init();
  }

  /** Buffers, locations and sampler units. Runs again after a context restore. */
  private init() {
    const gl = this.gl;

    this.quadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ctx.ARRAY_BUFFER, this.quadBuffer!);
    gl.bufferData(gl.ctx.ARRAY_BUFFER, this.quad, gl.ctx.STATIC_DRAW);
    this.positionLocation = gl.getAttribLocation('basic2DProgram', 'a_position');

    for (const item of this.attributes) {
      item.buffer = gl.createBuffer();
      gl.bindBuffer(gl.ctx.ARRAY_BUFFER, item.buffer!);
      gl.bufferData(gl.ctx.ARRAY_BUFFER, item.data, gl.ctx.DYNAMIC_DRAW);
      item.location = gl.getAttribLocation('basic2DProgram', item.name);
    }

    const units = Array.from({ length: PAGE_UNITS }, (_, unit) => unit);
    gl.ctx.uniform1iv(gl.getUniformLocation('basic2DProgram', 'u_pages'), units);
  }

  restore() {
    this.init();
  }

  private visibleWorldBounds(viewMatrix: number[], width: number, height: number): BoundingBox {
    const inverse = m3.inverse(viewMatrix);
    const a = m3.transformPoint(inverse, 0, 0);
    const b = m3.transformPoint(inverse, width, height);

    return { minX: Math.min(a.x, b.x), minY: Math.min(a.y, b.y), maxX: Math.max(a.x, b.x), maxY: Math.max(a.y, b.y) };
  }

  private isInView(entity: Entity, view: BoundingBox, zoom: number): boolean {
    const m = entity.matrix.getWorldMatrix();
    const scale = Math.max(Math.hypot(m[0], m[1]), Math.hypot(m[3], m[4]));
    // The vertex shader grows the quad by the stroke, and the fragment shader keeps strokes at least 1px wide.
    const pad = entity.style.strokeWidth * scale + 1 / zoom;
    const { bounds } = entity;

    return bounds.maxX + pad >= view.minX && bounds.minX - pad <= view.maxX && bounds.maxY + pad >= view.minY && bounds.minY - pad <= view.maxY;
  }

  private tileInView(m: number[], x0: number, x1: number, y0: number, y1: number, view: BoundingBox): boolean {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const [x, y] of [
      [x0, y0],
      [x1, y0],
      [x0, y1],
      [x1, y1],
    ]) {
      const wx = m[0] * x + m[3] * y + m[6];
      const wy = m[1] * x + m[4] * y + m[7];
      minX = Math.min(minX, wx);
      minY = Math.min(minY, wy);
      maxX = Math.max(maxX, wx);
      maxY = Math.max(maxY, wy);
    }

    return maxX >= view.minX && minX <= view.maxX && maxY >= view.minY && minY <= view.maxY;
  }

  private updateViewportAndResolution(width: number, height: number, viewMatrix: number[]) {
    const gl = this.gl;

    gl.setUniform2f('basic2DProgram', 'u_resolution', [width, height]);
    gl.setUniformMatrix3fv('basic2DProgram', 'u_viewport_transform_matrix', viewMatrix);
    gl.setUniform1f('basic2DProgram', 'u_zoom_level', Math.hypot(viewMatrix[0], viewMatrix[1]));
  }

  private bindAttributes() {
    const gl = this.gl.ctx;

    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    gl.enableVertexAttribArray(this.positionLocation);
    gl.vertexAttribPointer(this.positionLocation, 2, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(this.positionLocation, 0);

    for (const item of this.attributes) {
      if (item.location < 0) continue;

      gl.bindBuffer(gl.ARRAY_BUFFER, item.buffer);

      // A mat3 attribute takes three consecutive locations, one per column.
      const columns = item.size === 9 ? 3 : 1;
      const columnSize = item.size / columns;

      for (let column = 0; column < columns; column++) {
        gl.enableVertexAttribArray(item.location + column);
        gl.vertexAttribPointer(item.location + column, columnSize, gl.FLOAT, false, item.size * 4, column * columnSize * 4);
        gl.vertexAttribDivisor(item.location + column, 1);
      }
    }
  }

  private flush(reason: string) {
    if (!this.count) return;

    const gl = this.gl.ctx;

    for (const item of this.attributes) {
      if (item.location < 0) continue;

      gl.bindBuffer(gl.ARRAY_BUFFER, item.buffer);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, item.data, 0, this.count * item.size);
    }

    this.bindAttributes();
    gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, this.count);
    this.canvas.debug?.draw(this.count, this.units.size, reason);
    this.count = 0;
  }

  /** Binds the page to a texture unit, drawing what is queued first when all units are taken. */
  private unitFor(page: number): number {
    const bound = this.units.get(page);
    if (bound !== undefined) return bound;

    if (this.units.size === PAGE_UNITS) {
      this.flush('Page units full');
      this.units.clear();
    }

    const unit = this.units.size;
    const gl = this.gl.ctx;

    this.units.set(page, unit);
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, this.textureManager.pageTexture(page));

    return unit;
  }

  private push(entity: Entity, matrix: number[], width: number, height: number, texture: ResolvedTexture | null, mode: Mode): void {
    const unit = texture ? this.unitFor(texture.page) : 0;

    if (this.count === MAX_INSTANCES) this.flush('Instance limit reached');

    const i = this.count++;
    const filters = entity.texture;

    this.matrices.set(matrix, i * 9);
    this.sizes[i * 2] = width;
    this.sizes[i * 2 + 1] = height;
    this.fills.set(mode === 'stroke' ? TRANSPARENT : argbToRgba(entity.style.fill), i * 4);
    this.strokes.set(argbToRgba(entity.style.stroke), i * 4);
    this.strokeWidths[i] = mode === 'image' ? 0 : entity.style.strokeWidth;
    this.hasTextures[i] = texture ? 1 : 0;
    this.uvs.set(texture ? texture.uv : FULL_UV, i * 4);
    this.pages[i] = unit;

    this.filters1[i * 4] = filters?.brightness ?? 1;
    this.filters1[i * 4 + 1] = filters?.contrast ?? 1;
    this.filters1[i * 4 + 2] = filters?.saturation ?? 1;
    this.filters1[i * 4 + 3] = filters?.hue ?? 0;
    this.filters2[i * 2] = filters?.sepia ?? 0;
    this.filters2[i * 2 + 1] = filters?.invert ?? 0;
  }

  /** One quad per visible tile at the level the image is drawn at, then the stroke on top. */
  private pushImage(entity: Entity, view: BoundingBox, zoom: number): void {
    const textures = this.textureManager;
    const url = entity.texture!.data.url;
    const m = entity.matrix.getWorldMatrix();
    const width = entity.size.width || 100;
    const height = entity.size.height || 100;
    const devicePixels = zoom * this.canvas.dpr;
    const level = textures.levelFor(url, width * Math.hypot(m[0], m[1]) * devicePixels, height * Math.hypot(m[3], m[4]) * devicePixels);

    if (level === null) {
      this.push(entity, m, width, height, null, 'image');
    } else {
      const grid = textures.tileGrid(url, level);

      for (let row = 0; row < grid.rows; row++) {
        for (let column = 0; column < grid.cols; column++) {
          const tx = grid.single ? -1 : column;
          const ty = grid.single ? -1 : row;
          const region = textures.region(url, level, tx, ty);

          // Region y runs down the image; local y runs up, with the image top at +height / 2.
          const x0 = (region.x0 - 0.5) * width;
          const x1 = (region.x1 - 0.5) * width;
          const top = (0.5 - region.y0) * height;
          const bottom = (0.5 - region.y1) * height;

          if (!grid.single && !this.tileInView(m, x0, x1, bottom, top, view)) continue;

          const cx = (x0 + x1) / 2;
          const cy = (top + bottom) / 2;
          const tile = [m[0], m[1], 0, m[3], m[4], 0, m[0] * cx + m[3] * cy + m[6], m[1] * cx + m[4] * cy + m[7], 1];

          this.push(entity, tile, x1 - x0, top - bottom, textures.resolve(url, level, tx, ty, region), 'image');
        }
      }
    }

    if (entity.style.strokeWidth > 0) {
      this.push(entity, m, width, height, null, 'stroke');
    }
  }

  /** Returns how many tiles were drawn from a coarser level or skipped because they are still streaming. */
  render(world: World, width = this.canvas.width, height = this.canvas.height, viewMatrix = this.camera.viewportTransformMatrix): number {
    this.updateViewportAndResolution(width, height, viewMatrix);
    this.textureManager.beginFrame();

    const view = this.visibleWorldBounds(viewMatrix, width, height);
    const zoom = Math.hypot(viewMatrix[0], viewMatrix[1]);
    const culling = this.canvas.debug?.culling ?? true;
    let culled = 0;

    const margin = 2 / zoom;
    let candidates: readonly Entity[];
    if (culling) {
      candidates = world.search({ minX: view.minX - margin, minY: view.minY - margin, maxX: view.maxX + margin, maxY: view.maxY + margin });
    } else {
      candidates = world.getPaintOrder();
    }
    culled = world.size - candidates.length;

    for (const entity of candidates) {
      if (!entity.visibility.visible) {
        continue;
      }

      if (culling && !this.isInView(entity, view, zoom)) {
        culled++;
        continue;
      }

      if (entity.texture?.data.loaded) {
        this.pushImage(entity, view, zoom);
      } else {
        this.push(entity, entity.matrix.getWorldMatrix(), entity.size.width || 100, entity.size.height || 100, null, 'shape');
      }
    }

    this.flush('End of scene');
    this.units.clear();
    this.gl.ctx.activeTexture(this.gl.ctx.TEXTURE0);
    this.canvas.debug?.cull(culled);

    return this.textureManager.endFrame();
  }
}
