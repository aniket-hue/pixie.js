import type { BoundingBox } from '../../types';
import type { Camera } from '../Camera.class';
import type { Canvas } from '../Canvas.class';
import type { World } from '../ecs/World.class';
import { m3 } from '../math';
import type { SceneRenderer } from '../SceneRenderer.class';
import type { GlCore } from './GlCore.class';

export class Capture {
  private canvas: Canvas;
  private gl: GlCore;
  private camera: Camera;
  private world: World;
  private renderer: SceneRenderer;

  constructor(canvas: Canvas) {
    this.canvas = canvas;
    this.gl = this.canvas.getGlCore();
    this.camera = canvas.camera;
    this.world = canvas.world;
    this.renderer = canvas['sceneRenderer'];
  }

  captureRegion(p: BoundingBox): string {
    const gl = this.gl;

    const { minX, minY, maxX, maxY } = p;

    const savedViewport = gl.ctx.getParameter(gl.ctx.VIEWPORT);
    const savedCameraTransform = [...this.camera.viewportTransformMatrix];

    this.adjustViewport({ minX, minY, maxX, maxY });
    const aspectRatio = (maxX - minX) / (maxY - minY);

    const height = this.camera.context.height;
    const width = Math.ceil(height * aspectRatio);

    try {
      gl.clear();

      this.renderer.render(this.world);

      const pixels = new Uint8Array(width * height * 4);
      gl.ctx.readPixels(0, 0, width, height, gl.ctx.RGBA, gl.ctx.UNSIGNED_BYTE, pixels);
      const dataURL = this.pixelsToDataURL(pixels, width, height);

      return dataURL;
    } finally {
      gl.ctx.viewport(savedViewport[0], savedViewport[1], savedViewport[2], savedViewport[3]);
      this.camera.viewportTransformMatrix = savedCameraTransform;
      this.canvas.requestRender();
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

  adjustViewport(p: { minX: number; minY: number; maxX: number; maxY: number; padding?: number }) {
    const { minX, minY, maxX, maxY, padding = 0 } = p;
    const canvasWidth = this.canvas.width;
    const canvasHeight = this.canvas.height;

    const width = maxX - minX;
    const height = maxY - minY;

    const paddedWidth = width + padding * 2;
    const paddedHeight = height + padding * 2;

    const scaleX = canvasWidth / paddedWidth;
    const scaleY = canvasHeight / paddedHeight;
    const scale = Math.min(scaleX, scaleY);

    const tlx = minX;
    const tly = minY;

    let m = m3.identity();

    m = m3.multiply(m, m3.scale(scale, scale));
    m = m3.multiply(m, m3.translate(-tlx, -tly));

    this.camera.viewportTransformMatrix = m;
  }
}
