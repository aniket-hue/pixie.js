import type { Camera } from './Camera.class';

import type { Canvas } from './Canvas.class';
import { BoundsSystem } from './ecs/systems/BoundsSystem.class';
import { InteractiveSystem } from './ecs/systems/InteractiveSystem.class';
import { RenderSystem } from './ecs/systems/RenderSystem.class';
import { Events } from './events';
import { Grid } from './Grid.class';

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
  boundsSystem: BoundsSystem;

  private renderRequested = false;

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

    this.initListeners();

    this.ecsRenderSystem = new RenderSystem(this.ctx, this.canvas.world, this.camera);
    this.interactiveSystem = new InteractiveSystem(this.canvas.world, this.canvas, this.camera);
    this.boundsSystem = new BoundsSystem(this.canvas.world);
  }

  componentsUpdated(entityId: number, componentName: string) {
    switch (componentName) {
      case 'transform':
      case 'size':
        this.boundsSystem.updateEntity(entityId);
        this.render();
        break;
    }
  }

  render() {
    this.grid.draw(this.ctx, { program: this.ecsRenderSystem.program });
    this.ecsRenderSystem.update();
  }

  requestRender() {
    if (!this.renderRequested) {
      this.renderRequested = true;

      requestAnimationFrame(() => {
        this.updateDirtyComponents();
        this.render();
        this.renderRequested = false;
      });
    }
  }

  private updateDirtyComponents() {
    const dirtyEntities = this.canvas.world.getDirtyEntities();

    for (const entityId of dirtyEntities) {
      this.boundsSystem.updateEntity(entityId);
    }

    this.canvas.world.clearDirty();
  }

  initListeners() {
    this.render = this.render.bind(this);
    this.componentsUpdated = this.componentsUpdated.bind(this);

    this.canvas.on(Events.ZOOM_CHANGED, this.render);
    this.canvas.on(Events.PAN_CHANGED, this.render);
    this.canvas.on(Events.RENDER, this.render);
    this.canvas.on(Events.COMPONENTS_UPDATED, this.componentsUpdated);
  }

  destroyListeners() {
    this.canvas.off(Events.ZOOM_CHANGED, this.render);
    this.canvas.off(Events.PAN_CHANGED, this.render);
    this.canvas.off(Events.RENDER, this.render);
    this.canvas.off(Events.COMPONENTS_UPDATED, this.componentsUpdated);
  }

  destroy() {
    this.destroyListeners();
    this.interactiveSystem.destroy();
  }
}
