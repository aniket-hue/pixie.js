import { Camera } from './Camera.class';
import { TransformControls } from './controls/TransformControls.class';
import type { Entity } from './ecs/base/Entity.class';
import { group, type Restack, restack, ungroup } from './ecs/order';
import { type Query, World } from './ecs/World.class';
import { EventEmitter, type EventKeys, type EventMap, Events } from './events';
import { InputHandler } from './events/input/InputHandler.class';
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

function fitSize(requested: { width?: number; height?: number }, natural: { width: number; height: number }) {
  const { width, height } = requested;

  if (width !== undefined && height !== undefined) return { width, height };
  if (width !== undefined) return { width, height: (width * natural.height) / natural.width };
  if (height !== undefined) return { width: (height * natural.width) / natural.height, height };

  return natural;
}

export class Canvas {
  public debug: RenderDebug | null = null;
  private events = new EventEmitter<EventMap>();
  private glCore: GlCore;
  private inputHandler: InputHandler;

  private sceneRenderer: SceneRenderer;
  private overlayRenderer: OverlayRenderer;

  /** @internal */
  transformControls: TransformControls | null = null;

  /** @internal */
  modeManager: InteractionModeManager;

  private capture: Capture | null = null;

  private pendingFrame: number | null = null;
  private frameWaiters: Array<() => void> = [];

  private resizeObserver: ResizeObserver | null = null;
  private dprQuery: MediaQueryList | null = null;
  private handleDprChange: (() => void) | null = null;
  private pixelRatio = window.devicePixelRatio || 1;

  private contextLost = false;
  private loads = new Map<Entity, Promise<boolean>>();

  /** @internal */
  topCanvas: HTMLCanvasElement | null = null;
  private canvasElement: HTMLCanvasElement;

  /** @internal */
  selectionManager: SelectionManager;
  drawing: DrawingManager;

  /** @internal */
  world: World;
  camera: Camera;

  /** @internal */
  get textureManager() {
    return this.sceneRenderer.textureManager;
  }

  textureStats() {
    const textures = this.textureManager;
    return { ...textures.stats(), pageUsage: textures.pageStats(), recentLoads: [...textures.recentLoads()] };
  }

  constructor(canvas: HTMLCanvasElement) {
    this.canvasElement = canvas;

    this.glCore = new GlCore(this.canvasElement);
    this.world = new World(() => this.fire(Events.ORDER_CHANGED));
    this.camera = new Camera(this);
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

  private initTopCanvas(): void {
    const rect = this.canvasElement.getBoundingClientRect();

    const topCanvas = document.createElement('canvas');

    topCanvas.width = Math.round(rect.width * this.dpr);
    topCanvas.height = Math.round(rect.height * this.dpr);

    topCanvas.style.position = 'absolute';

    topCanvas.style.width = `${rect.width}px`;
    topCanvas.style.height = `${rect.height}px`;

    topCanvas.style.zIndex = '1';
    topCanvas.style.pointerEvents = 'none';

    const parent = this.canvasElement.parentElement;
    // Both canvases then share one containing block, so page or container scroll moves them together.
    if (parent && getComputedStyle(parent).position === 'static') {
      parent.style.position = 'relative';
    }
    parent?.insertBefore(topCanvas, this.canvasElement);
    this.topCanvas = topCanvas;
    this.placeTopCanvas();
  }

  // Offsets, not page coordinates: they stay valid while scrolling. Rechecked each frame to follow layout moves.
  private placeTopCanvas(): void {
    const top = this.topCanvas;
    if (!top) return;

    const canvas = this.canvasElement;
    const left = `${canvas.offsetLeft + canvas.clientLeft}px`;
    const offsetTop = `${canvas.offsetTop + canvas.clientTop}px`;

    if (top.style.left !== left) top.style.left = left;
    if (top.style.top !== offsetTop) top.style.top = offsetTop;
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

    this.placeTopCanvas();
    this.glCore.clear();

    this.world.flushBounds();
    this.selectionManager.syncFrame();

    this.sceneRenderer.render(this.world);
    this.overlayRenderer.render(this.world);

    this.drawing.render();
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

  add(...entities: Entity[]): void {
    for (const entity of entities) {
      this.world.addEntity(entity);
      this.loadImages(entity);
    }

    this.requestRender('Canvas.add');
  }

  remove(...entities: Entity[]): void {
    const selected = this.selectionManager.selected;

    for (const entity of entities) {
      this.world.removeEntity(entity);
    }

    // Frees GPU tiles and decoded pixels of images nothing shows any more.
    this.textureManager.collect(this.world.liveTextureUrls());
    this.selectionManager.select(selected.filter((entity) => entity.world));
    this.requestRender('Canvas.remove');
  }

  getObjects(): Entity[] {
    return [...this.world.getRoots()];
  }

  query(query: Query, filter?: (entity: Entity) => boolean): Entity[] {
    return this.world.query(query, filter);
  }

  bringToFront(entities: Entity[]): void {
    this.restack(entities, 'front');
  }

  sendToBack(entities: Entity[]): void {
    this.restack(entities, 'back');
  }

  bringForward(entities: Entity[]): void {
    this.restack(entities, 'forward');
  }

  sendBackward(entities: Entity[]): void {
    this.restack(entities, 'backward');
  }

  private restack(entities: Entity[], how: Restack): void {
    if (restack(this.world, entities, how)) {
      this.requestRender(`Canvas.restack ${how}`);
    }
  }

  group(entities: Entity[]): Entity | null {
    const selected = this.selectionManager.selected;
    const created = group(this.world, entities);

    if (created) {
      this.selectionManager.select(selected.filter((entity) => !entities.includes(entity)));
      this.requestRender('Canvas.group');
    }

    return created;
  }

  ungroup(target: Entity): Entity[] {
    const children = ungroup(this.world, target);

    this.selectionManager.select(this.selectionManager.selected.filter((entity) => entity.world));
    this.requestRender('Canvas.ungroup');

    return children;
  }

  async whenLoaded(entities: Entity[] = [...this.loads.keys()]): Promise<{ failed: Entity[] }> {
    await Promise.all(entities.map((entity) => this.loads.get(entity)));
    return { failed: entities.filter((entity) => entity.texture?.error) };
  }

  private loadImages(entity: Entity): void {
    const texture = entity.texture;

    if (texture && !texture.data.loaded && !this.loads.has(entity)) {
      const load = this.textureManager.loadTexture(texture.data.url).then(
        (data) => {
          const size = fitSize(texture.requestedSize, data);

          entity.size.setWidth(size.width);
          entity.size.setHeight(size.height);
          texture.error = null;
          texture.setTexture(data);

          return true;
        },
        (error: unknown) => {
          texture.error = error instanceof Error ? error.message : String(error);
          return false;
        },
      );

      this.loads.set(entity, load);

      load.then(() => {
        this.loads.delete(entity);

        // Skip entities removed meanwhile, and canvases already destroyed.
        if (entity.world === this.world && this.topCanvas) {
          this.requestRender('Canvas: image loaded');
        }
      });
    }

    for (const child of entity.hierarchy.children) {
      this.loadImages(child);
    }
  }

  getSelectedObjects(): Entity[] {
    return this.selectionManager.selected;
  }

  select(entities: Entity[]): void {
    this.selectionManager.select(entities);
  }

  clearSelection(): void {
    this.selectionManager.clearSelection();
  }

  selectAll(): void {
    this.selectionManager.selectAll();
  }

  private getCtx(): WebGLRenderingContext | null {
    return this.glCore.ctx;
  }

  private resize(): boolean {
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
      this.topCanvas.width = targetWidth;
      this.topCanvas.height = targetHeight;

      this.topCanvas.style.width = `${cssWidth}px`;
      this.topCanvas.style.height = `${cssHeight}px`;
      this.placeTopCanvas();
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

  on<K extends EventKeys>(event: K, callback: (...args: EventMap[K]) => void): void {
    this.events.on(event, callback);
  }

  off<K extends EventKeys>(event: K, callback: (...args: EventMap[K]) => void): void {
    this.events.off(event, callback);
  }

  /** @internal */
  fire<K extends EventKeys>(event: K, ...args: EventMap[K]): void {
    this.events.emit(event, ...args);
  }

  /** @internal */
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
