import type { Camera } from './Camera.class';

import type { Canvas } from './Canvas.class';
import { Events } from './events';
import { InteractiveSystem, RenderSystem } from './systems';

export class Renderer {
  canvas: Canvas;
  ctx: WebGLRenderingContext;
  camera: Camera;
  baseProgram: Partial<{
    basic2D: WebGLProgram;
  }> = {};

  ecsRenderSystem: RenderSystem;
  interactiveSystem: InteractiveSystem;

  private renderRequested = false;

  constructor(canvas: Canvas, camera: Camera) {
    this.canvas = canvas;
    const webglCtx = this.canvas.getCtx();

    if (!webglCtx) {
      throw new Error('WebGL not supported');
    }

    this.ctx = webglCtx;
    this.camera = camera;

    this.initListeners();

    this.ecsRenderSystem = new RenderSystem(this.canvas);
    this.interactiveSystem = new InteractiveSystem(this.canvas);
  }

  render() {
    this.ecsRenderSystem.update(this.canvas.objects);
    this.canvas.world.clearDirty();
  }

  requestRender() {
    if (!this.renderRequested) {
      this.renderRequested = true;

      requestAnimationFrame(() => {
        this.render();
        this.renderRequested = false;
      });
    }
  }

  initListeners() {
    this.render = this.render.bind(this);

    this.canvas.on(Events.ZOOM_CHANGED, this.render);
    this.canvas.on(Events.PAN_CHANGED, this.render);
    this.canvas.on(Events.RENDER, this.render);
  }

  destroyListeners() {
    this.canvas.off(Events.ZOOM_CHANGED, this.render);
    this.canvas.off(Events.PAN_CHANGED, this.render);
    this.canvas.off(Events.RENDER, this.render);
  }

  destroy() {
    this.destroyListeners();
    this.interactiveSystem.destroy();
  }
}
