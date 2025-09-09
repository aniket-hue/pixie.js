import { Events } from './events';
import type { IRenderingContext } from './interfaces';
import { InteractiveSystem, RenderSystem } from './systems';

export class Renderer {
  context: IRenderingContext & { getGlCore(): any };
  baseProgram: Partial<{
    basic2D: WebGLProgram;
  }> = {};

  ecsRenderSystem: RenderSystem;
  interactiveSystem: InteractiveSystem;

  private renderRequested = false;

  constructor(context: IRenderingContext & { getGlCore(): any }) {
    this.context = context;

    this.initListeners();

    this.ecsRenderSystem = new RenderSystem(this.context);
    this.interactiveSystem = new InteractiveSystem(this.context as any);
  }

  render() {
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
