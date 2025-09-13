import { Events } from './events';
import type { GraphicsEngine } from './GraphicsEngine.class';
import { InteractiveSystem, RenderSystem, TransformSystem, VisibleSystem } from './systems';

export class Renderer {
  context: GraphicsEngine;
  baseProgram: Partial<{
    basic2D: WebGLProgram;
  }> = {};

  ecsRenderSystem: RenderSystem;
  interactiveSystem: InteractiveSystem;
  transformSystem: TransformSystem;
  visibleSystem: VisibleSystem;

  private renderRequested = false;

  constructor(context: GraphicsEngine) {
    this.context = context;

    this.initListeners();

    this.ecsRenderSystem = new RenderSystem(this.context);
    this.interactiveSystem = new InteractiveSystem(this.context);
    this.transformSystem = new TransformSystem(this.context);
    this.visibleSystem = new VisibleSystem(this.context);
  }

  render() {
    const dirtyObjects = this.context.objects.filter((object) => object.dirty);

    this.transformSystem.update(dirtyObjects);
    this.visibleSystem.update(dirtyObjects);
    this.ecsRenderSystem.update(this.context.objects);

    this.context.world.clearDirty();
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

    this.context.on(Events.ZOOM_CHANGED, this.render);
    this.context.on(Events.PAN_CHANGED, this.render);
    this.context.on(Events.RENDER, this.render);
  }

  destroyListeners() {
    this.context.off(Events.ZOOM_CHANGED, this.render);
    this.context.off(Events.PAN_CHANGED, this.render);
    this.context.off(Events.RENDER, this.render);
  }

  destroy() {
    this.destroyListeners();
    this.interactiveSystem.destroy();
  }
}
