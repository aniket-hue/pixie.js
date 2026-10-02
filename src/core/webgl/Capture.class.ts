import type { BoundingBox } from '../../types';
import type { Canvas } from '../Canvas.class';
import type { World } from '../ecs/World.class';
import { m3 } from '../lib/math';
import type { SceneRenderer } from '../SceneRenderer.class';
import type { GlCore } from './GlCore.class';

const MAX_TILE_PASSES = 5;

export class Capture {
  private canvas: Canvas;
  private gl: GlCore;
  private world: World;
  private renderer: SceneRenderer;

  constructor(canvas: Canvas) {
    this.canvas = canvas;
    this.gl = this.canvas.getGlCore();
    this.world = canvas.world;
    this.renderer = canvas['sceneRenderer'];
  }

  /** Renders a world region offscreen. Waits for the tiles that resolution needs, so exports never use blurry fallbacks. */
  async captureRegion(p: BoundingBox): Promise<string> {
    const gl = this.gl.ctx;

    const { minX, minY, maxX, maxY } = p;
    const worldWidth = maxX - minX;
    const worldHeight = maxY - minY;
    const height = this.canvas.height;

    if (!Number.isFinite(worldWidth) || !Number.isFinite(worldHeight) || worldWidth <= 0 || worldHeight <= 0 || height <= 0) {
      throw new Error('Cannot capture empty or invalid bounds');
    }

    const width = Math.ceil((height * worldWidth) / worldHeight);
    const pixelWidth = Math.ceil(width * this.canvas.dpr);
    const pixelHeight = Math.ceil(height * this.canvas.dpr);
    const maxSize = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE) as number;

    if (pixelWidth > maxSize || pixelHeight > maxSize) {
      throw new Error(`Capture exceeds the WebGL renderbuffer limit of ${maxSize} pixels`);
    }

    const viewMatrix = m3.multiply(m3.scale(height / worldHeight, height / worldHeight), m3.translate(-minX, -minY));
    const textures = this.renderer.textureManager;
    textures.keepStaleRequests = true;

    try {
      for (let pass = 0; pass < MAX_TILE_PASSES; pass++) {
        const { missing } = this.renderPass(viewMatrix, width, height, pixelWidth, pixelHeight, false);
        if (!missing) break;
        await textures.whenIdle();
      }

      return this.renderPass(viewMatrix, width, height, pixelWidth, pixelHeight, true).dataURL!;
    } finally {
      textures.keepStaleRequests = false;
      this.canvas.requestRender('Capture.done');
    }
  }

  private renderPass(viewMatrix: number[], width: number, height: number, pixelWidth: number, pixelHeight: number, read: boolean): { missing: number; dataURL?: string } {
    const gl = this.gl.ctx;
    const savedViewport = gl.getParameter(gl.VIEWPORT) as Int32Array;
    const savedFramebuffer = gl.getParameter(gl.FRAMEBUFFER_BINDING) as WebGLFramebuffer | null;
    const savedRenderbuffer = gl.getParameter(gl.RENDERBUFFER_BINDING) as WebGLRenderbuffer | null;
    const framebuffer = gl.createFramebuffer();
    const color = gl.createRenderbuffer();

    if (!framebuffer || !color) {
      if (framebuffer) gl.deleteFramebuffer(framebuffer);
      if (color) gl.deleteRenderbuffer(color);
      throw new Error('Failed to create capture framebuffer');
    }

    try {
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      gl.bindRenderbuffer(gl.RENDERBUFFER, color);
      gl.renderbufferStorage(gl.RENDERBUFFER, gl.RGBA8, pixelWidth, pixelHeight);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, color);

      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
        throw new Error('Capture framebuffer is incomplete');
      }

      gl.viewport(0, 0, pixelWidth, pixelHeight);

      let missing: number;
      this.canvas.debug?.begin('export', pixelWidth, pixelHeight);
      try {
        this.gl.clear();
        this.world.flushBounds();
        missing = this.renderer.render(this.world, width, height, viewMatrix);
      } finally {
        this.canvas.debug?.end();
      }

      if (!read) {
        return { missing };
      }

      const pixels = new Uint8Array(pixelWidth * pixelHeight * 4);
      gl.readPixels(0, 0, pixelWidth, pixelHeight, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

      return { missing, dataURL: this.pixelsToDataURL(pixels, pixelWidth, pixelHeight) };
    } finally {
      gl.bindFramebuffer(gl.FRAMEBUFFER, savedFramebuffer);
      gl.bindRenderbuffer(gl.RENDERBUFFER, savedRenderbuffer);
      gl.viewport(savedViewport[0], savedViewport[1], savedViewport[2], savedViewport[3]);
      gl.deleteFramebuffer(framebuffer);
      gl.deleteRenderbuffer(color);
    }
  }

  private pixelsToDataURL(pixels: Uint8Array, width: number, height: number): string {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Failed to get 2D context');
    }

    const imageData = ctx.createImageData(width, height);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const srcIdx = (y * width + x) * 4;
        const dstIdx = ((height - 1 - y) * width + x) * 4;

        imageData.data[dstIdx] = pixels[srcIdx];
        imageData.data[dstIdx + 1] = pixels[srcIdx + 1];
        imageData.data[dstIdx + 2] = pixels[srcIdx + 2];
        imageData.data[dstIdx + 3] = pixels[srcIdx + 3];
      }
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL('image/png');
  }

}
