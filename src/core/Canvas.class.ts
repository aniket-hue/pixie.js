import { Camera } from './Camera.class';
import { TransformControls } from './controls/TransformControls.class';
import type { Entity } from './ecs/base/Entity.class';
import { World } from './ecs/World.class';
import { EventEmitter, type EventKeys } from './events';
import { InputHandler } from './events/input/InputHandler.class';
import { createImage } from './factory/image';
import type { ImageProps } from './factory/types';
import { InteractionModeManager } from './mode/InteractionModeManager.class';
import { OverlayRenderer } from './OverlayRenderer.class';
import { SceneRenderer } from './SceneRenderer.class';
import type { RenderDebug } from './RenderDebug.class';
import { SelectionManager } from './selection/SelectionManager.class';
import { GlCore } from './webgl/GlCore.class';

import './app/colors';
import type { BoundingBox } from '../types';
import { DrawingManager } from './drawing/DrawingManager.class';
import { assert } from './lib/assert';
import { Capture } from './webgl/Capture.class';
import { Picking } from './webgl/Picking.class';

export class Canvas {
  public debug: RenderDebug | null = null;
  private events = new EventEmitter();
  private glCore: GlCore;
  private inputHandler: InputHandler;

  private sceneRenderer: SceneRenderer;
  public overlayRenderer: OverlayRenderer;

  public transformControls: TransformControls | null = null;

  public modeManager: InteractionModeManager;

  private capture: Capture | null = null;

  private pendingFrame: number | null = null;
  private frameWaiters: Array<() => void> = [];

  private resizeObserver: ResizeObserver | null = null;
  private dprQuery: MediaQueryList | null = null;
  private handleDprChange: (() => void) | null = null;
  private pixelRatio = window.devicePixelRatio || 1;

  private contextLost = false;

  topCanvas: HTMLCanvasElement | null = null;
  canvasElement: HTMLCanvasElement;

  selectionManager: SelectionManager;
  drawing: DrawingManager;

  world: World;
  camera: Camera;
  picker: Picking;

  // Expose textureManager for debugging
  get textureManager() {
    return this.sceneRenderer.textureManager;
  }

  constructor(canvas: HTMLCanvasElement) {
    this.canvasElement = canvas;

    this.glCore = new GlCore(this.canvasElement);
    this.world = new World();
    this.camera = new Camera(this);
    this.picker = new Picking(this);
    this.inputHandler = new InputHandler(this);
    this.modeManager = new InteractionModeManager();
    this.transformControls = new TransformControls(this, this.modeManager);
    this.selectionManager = new SelectionManager(this);
    this.sceneRenderer = new SceneRenderer(this);

    this.resize();
    this.initTopCanvas();

    assert(this.topCanvas !== null, 'Top canvas not initialized');

    this.overlayRenderer = new OverlayRenderer(this);
    this.drawing = new DrawingManager(this);

    this.capture = new Capture(this);

    this.handleContextLost = this.handleContextLost.bind(this);
    this.handleContextRestored = this.handleContextRestored.bind(this);
    this.canvasElement.addEventListener('webglcontextlost', this.handleContextLost);
    this.canvasElement.addEventListener('webglcontextrestored', this.handleContextRestored);

    this.observeResize();
  }

  private handleContextLost(event: Event): void {
    // Without preventDefault the browser never fires webglcontextrestored.
    event.preventDefault();
    this.contextLost = true;
  }

  private handleContextRestored(): void {
    this.glCore.restore();
    this.sceneRenderer.restore();
    this.textureManager.restore();
    this.getCtx()?.viewport(0, 0, this.canvasElement.width, this.canvasElement.height);

    this.contextLost = false;
    this.requestRender('Canvas.contextRestored');
  }

  initTopCanvas(): void {
    const rect = this.canvasElement.getBoundingClientRect();

    const topCanvas = document.createElement('canvas');

    topCanvas.width = Math.round(rect.width * this.dpr);
    topCanvas.height = Math.round(rect.height * this.dpr);

    topCanvas.style.position = 'absolute';

    topCanvas.style.width = `${rect.width}px`;
    topCanvas.style.height = `${rect.height}px`;
    topCanvas.style.top = `${rect.top}px`;
    topCanvas.style.left = `${rect.left}px`;

    topCanvas.style.zIndex = '1';
    topCanvas.style.pointerEvents = 'none';
    this.canvasElement.parentElement?.insertBefore(topCanvas, this.canvasElement);
    this.topCanvas = topCanvas;
  }

  requestRender(source = 'External requestRender'): Promise<void> {
    this.debug?.request(source);

    return new Promise((resolve) => {
      this.frameWaiters.push(resolve);

      if (this.pendingFrame !== null) {
        return;
      }

      this.pendingFrame = requestAnimationFrame(() => {
        this.pendingFrame = null;

        this.debug?.begin('viewport', this.canvasElement.width, this.canvasElement.height);
        try {
          this.renderFrame();
        } finally {
          this.debug?.end();
        }

        const waiters = this.frameWaiters;
        this.frameWaiters = [];

        for (const resolveWaiter of waiters) {
          resolveWaiter();
        }
      });
    });
  }

  private renderFrame(): void {
    if (this.contextLost) {
      return;
    }

    if (this.world.takeTexturedRemoval()) {
      this.textureManager.collect(this.world.getLiveTextureUrls());
    }

    this.glCore.clear();

    this.world.reindexDirty();

    const allEntities = this.world.getEntities();

    this.sceneRenderer.render(this.world);
    this.overlayRenderer.render(this.world);

    this.drawing.render();

    for (const entity of allEntities) {
      entity.dirty.clearDirty();
    }
  }

  get width(): number {
    return this.canvasElement.clientWidth;
  }

  get height(): number {
    return this.canvasElement.clientHeight;
  }

  get dpr(): number {
    return this.pixelRatio;
  }

  get zoom(): number {
    return this.camera.zoom;
  }

  set zoom(value: number) {
    this.camera.zoom = value;

    this.requestRender('Canvas.zoom');
  }

  get element(): HTMLCanvasElement {
    return this.canvasElement;
  }

  getActiveGroup(): Entity | null {
    return this.selectionManager.activeGroup;
  }

  getSelectedObjects(): Entity[] {
    if (!this.selectionManager.activeGroup) {
      return [];
    }

    return this.selectionManager.activeGroup.hierarchy.children;
  }

  addImage(props: ImageProps): { entity: Entity; ready: Promise<Entity> } {
    const { entity, promise } = createImage(props, this.textureManager)();

    this.world.addEntity(entity);
    this.requestRender('Canvas.addImage');

    const ready = promise.then((loaded) => {
      if (entity.world === this.world && this.topCanvas) {
        this.requestRender('Canvas.addImage: loaded');
      }
      return loaded;
    }, (error) => {
      if (entity.world === this.world && this.topCanvas) {
        this.requestRender('Canvas.addImage: failed');
      }
      throw error;
    });

    return { entity, ready };
  }

  getCtx(): WebGLRenderingContext | null {
    return this.glCore.ctx;
  }

  clear(r = 0, g = 0, b = 0, a = 1.0): void {
    const gl = this.getCtx();
    if (!gl) return;

    gl.clearColor(r, g, b, a);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  resize(): boolean {
    const canvas = this.canvasElement;
    const dpr = this.dpr;

    const cssWidth = canvas.clientWidth;
    const cssHeight = canvas.clientHeight;

    const targetWidth = Math.round(cssWidth * dpr);
    const targetHeight = Math.round(cssHeight * dpr);

    if (canvas.width === targetWidth && canvas.height === targetHeight) {
      return false;
    }

    canvas.width = targetWidth;
    canvas.height = targetHeight;

    if (this.topCanvas) {
      const rect = canvas.getBoundingClientRect();

      this.topCanvas.width = targetWidth;
      this.topCanvas.height = targetHeight;

      this.topCanvas.style.width = `${cssWidth}px`;
      this.topCanvas.style.height = `${cssHeight}px`;
      this.topCanvas.style.top = `${rect.top}px`;
      this.topCanvas.style.left = `${rect.left}px`;
    }

    this.getCtx()?.viewport(0, 0, targetWidth, targetHeight);

    return true;
  }

  private observeResize(): void {
    this.resizeObserver = new ResizeObserver(() => {
      if (this.resize()) {
        this.requestRender('Canvas.ResizeObserver');
      }
    });

    this.resizeObserver.observe(this.canvasElement);

    this.dprQuery = window.matchMedia(`(resolution: ${this.dpr}dppx)`);
    this.handleDprChange = () => {
      this.pixelRatio = window.devicePixelRatio || 1;

      if (this.resize()) {
        this.requestRender('Canvas.DPR changed');
      }

      this.dprQuery?.removeEventListener('change', this.handleDprChange!);
      this.dprQuery = window.matchMedia(`(resolution: ${this.dpr}dppx)`);
      this.dprQuery.addEventListener('change', this.handleDprChange!);
    };

    this.dprQuery.addEventListener('change', this.handleDprChange);
  }

  on(event: EventKeys, callback: (...args: any[]) => void): void {
    this.events.on(event, callback);
  }

  off(event: EventKeys, callback: (...args: any[]) => void): void {
    this.events.off(event, callback);
  }

  fire(event: EventKeys, ...args: any[]): void {
    this.events.emit(event, ...args);
  }

  getGlCore() {
    return this.glCore;
  }

  toDataURL(
    _options: { quality?: number },
    box: BoundingBox | { entities: Entity[] } = {
      minX: 0,
      minY: 0,
      maxX: this.width,
      maxY: this.height,
    },
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      requestIdleCallback(async () => {
        try {
          assert(this.capture !== null, 'Capture not initialized');

          let bounds: BoundingBox;

          if ('entities' in box) {
            const finalBounds = {
              minX: Infinity,
              minY: Infinity,
              maxX: -Infinity,
              maxY: -Infinity,
            };

            for (const entity of box.entities) {
              const entityBounds = entity.bounds.updateBounds();
              finalBounds.minX = Math.min(finalBounds.minX, entityBounds.minX);
              finalBounds.minY = Math.min(finalBounds.minY, entityBounds.minY);
              finalBounds.maxX = Math.max(finalBounds.maxX, entityBounds.maxX);
              finalBounds.maxY = Math.max(finalBounds.maxY, entityBounds.maxY);
            }

            bounds = finalBounds;
          } else {
            bounds = box;
          }

          resolve(await this.capture.captureRegion(bounds));
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  destroy(): void {
    this.debug = null;
    this.canvasElement.removeEventListener('webglcontextlost', this.handleContextLost);
    this.canvasElement.removeEventListener('webglcontextrestored', this.handleContextRestored);
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;

    if (this.dprQuery && this.handleDprChange) {
      this.dprQuery.removeEventListener('change', this.handleDprChange);
    }
    this.dprQuery = null;
    this.handleDprChange = null;

    if (this.pendingFrame !== null) {
      cancelAnimationFrame(this.pendingFrame);
      this.pendingFrame = null;
    }

    const waiters = this.frameWaiters;
    this.frameWaiters = [];
    for (const resolveWaiter of waiters) {
      resolveWaiter();
    }

    this.selectionManager.destroy();
    this.drawing.destroy();
    this.inputHandler.destroy();
    if (this.transformControls) {
      this.transformControls.destroy();
    }
    this.events.destroy();
    this.sceneRenderer.textureManager.cleanup();
    this.topCanvas?.remove();
    this.topCanvas = null;
  }
}
