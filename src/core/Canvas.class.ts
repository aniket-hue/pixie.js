import { Camera } from './Camera.class';
import { clearAllDirty, isDirty } from './ecs/components';
import { BoundsSystem } from './ecs/systems/BoundsSystem.class';
import { InteractiveSystem } from './ecs/systems/InteractiveSystem.class';
import { VisibleSystem } from './ecs/systems/VisibleSystem.class';
import { World } from './ecs/World.class';
import { EventEmitter, type EventKeys } from './events';
import { InputHandler } from './events/input/InputHandler.class';
import { OverlayRenderer } from './OverlayRenderer.class';
import { SceneRenderer } from './SceneRenderer.class';
import { SelectionManager } from './selection/SelectionManager.class';
import { GlCore } from './webgl/GlCore.class';

import './app/colors';
import { assert } from './lib/assert';
import { Picking } from './webgl/Picking.class';

/**
 * Simple wrapper around HTMLCanvasElement that provides a clean API
 * and delegates complex graphics operations to GraphicsEngine
 */
export class Canvas {
  private canvasElement: HTMLCanvasElement;
  private events: EventEmitter;
  private glCore: GlCore;
  private inputHandler: InputHandler;

  private interactiveSystem: InteractiveSystem;
  private visibleSystem: VisibleSystem;
  private boundsSystem: BoundsSystem;

  private sceneRenderer: SceneRenderer;
  private overlayRenderer: OverlayRenderer;
  topCanvas: HTMLCanvasElement | null = null;

  selectionManager: SelectionManager;

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
    this.events = new EventEmitter();
    this.world = new World();
    this.camera = new Camera(this);
    this.picker = new Picking(this);
    this.inputHandler = new InputHandler(this);

    this.selectionManager = new SelectionManager(this);

    this.interactiveSystem = new InteractiveSystem(this);
    this.visibleSystem = new VisibleSystem();
    this.boundsSystem = new BoundsSystem(this);

    this.sceneRenderer = new SceneRenderer(this);

    this.resize();
    this.initTopCanvas();

    assert(this.topCanvas !== null, 'Top canvas not initialized');

    this.overlayRenderer = new OverlayRenderer(this);
  }

  initTopCanvas(): void {
    const topCanvas = document.createElement('canvas');
    topCanvas.width = this.canvasElement.width;
    topCanvas.height = this.canvasElement.height;

    const rect = this.canvasElement.getBoundingClientRect();
    topCanvas.style.position = 'absolute';

    topCanvas.style.width = `${rect.width}px`;
    topCanvas.style.height = `${rect.height}px`;
    topCanvas.style.top = `${rect.top}px`;
    topCanvas.style.left = `${rect.left}px`;

    topCanvas.style.zIndex = '1000';
    topCanvas.style.pointerEvents = 'none';
    this.canvasElement.parentElement?.insertBefore(topCanvas, this.canvasElement);
    this.topCanvas = topCanvas;
  }

  requestRender() {
    requestAnimationFrame(() => {
      this.glCore.clear();

      const dirtyEntities = [];
      const allEntities = this.world.getEntities();

      for (const eid of allEntities) {
        if (isDirty(eid)) {
          dirtyEntities.push(eid);
        }
      }

      this.visibleSystem.update(dirtyEntities);
      this.boundsSystem.update(dirtyEntities);

      this.sceneRenderer.render(this.world);
      this.overlayRenderer.render(this.world);

      clearAllDirty();
    });
  }

  get width(): number {
    return this.canvasElement.clientWidth;
  }

  get height(): number {
    return this.canvasElement.clientHeight;
  }

  get zoom(): number {
    return this.camera.zoom;
  }

  get element(): HTMLCanvasElement {
    return this.canvasElement;
  }

  getActiveGroup(): number | null {
    return this.selectionManager.activeGroup;
  }

  removeEntity(eid: number) {
    this.world.removeEntity(eid);
    const bounds = this.boundsSystem.getBounds(eid);

    if (bounds) {
      this.boundsSystem.removeBounds(eid);
    }
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

  resize(): void {
    const canvas = this.canvasElement;
    const displayWidth = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;

    if (canvas.width === displayWidth && canvas.height === displayHeight) {
      return;
    }

    canvas.width = displayWidth;
    canvas.height = displayHeight;

    if (this.topCanvas) {
      this.topCanvas.width = displayWidth;
      this.topCanvas.height = displayHeight;
    }

    this.getCtx()?.viewport(0, 0, canvas.width, canvas.height);
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

  destroy(): void {
    this.events.destroy();
    this.inputHandler.destroy();
    this.interactiveSystem.destroy();
  }
}
