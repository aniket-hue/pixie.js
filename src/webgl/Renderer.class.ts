import type { Camera } from './Camera.class';

import type { Canvas } from './Canvas.class';
import { InteractiveSystem } from './ecs/systems/InteractiveSystem.class';
import { RenderSystem } from './ecs/systems/RenderSystem.class';
import { Events } from './events';
import { Grid } from './shapes/Grid.class';

export class Renderer {
  canvas: Canvas;
  grid: Grid;
  ctx: WebGLRenderingContext;
  camera: Camera;
  baseProgram: Partial<{
    basic2D: WebGLProgram;
  }> = {};

  ecsRenderSystem: RenderSystem;
  interactiveSystem: InteractiveSystem;

  constructor(canvas: Canvas, camera: Camera) {
    this.canvas = canvas;
    const webglCtx = this.canvas.getCtx();

    if (!webglCtx) {
      throw new Error('WebGL not supported');
    }

    this.ctx = webglCtx;
    this.camera = camera;
    this.grid = new Grid({
      gridSize: 100,
      color: [0.9, 0.9, 0.9, 0.5],
      majorGridSize: 500,
      majorColor: [0.8, 0.8, 0.8, 1],
    });

    this.ecsRenderSystem = new RenderSystem(this.ctx, this.canvas.world, this.camera);
    this.interactiveSystem = new InteractiveSystem(this.canvas.world, this.canvas, this.camera);

    this.initListeners();
  }

  render() {
    this.ecsRenderSystem.update();
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
