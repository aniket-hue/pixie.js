import { Camera } from './Camera.class';
import { TransformControls } from './controls/TransformControls.class';
import type { Entity } from './ecs/Entity.class';
import { World } from './ecs/World.class';
import { EventEmitter, type EventKeys } from './events';
import { InputHandler } from './events/input/InputHandler.class';
import { InteractionModeManager } from './mode/InteractionModeManager.class';
import { OverlayRenderer } from './OverlayRenderer.class';
import { SceneRenderer } from './SceneRenderer.class';
import { SelectionManager } from './selection/SelectionManager.class';
import { GlCore } from './webgl/GlCore.class';

import './app/colors';
import type { BoundingBox } from '../types';
import { DrawingManager } from './drawing/DrawingManager.class';
import { assert } from './lib/assert';
import { Capture } from './webgl/Capture.class';
import { Picking } from './webgl/Picking.class';

export class Canvas {
  private events: EventEmitter;
  private glCore: GlCore;
  private inputHandler: InputHandler;

  private sceneRenderer: SceneRenderer;
  public overlayRenderer: OverlayRenderer;

  public transformControls: TransformControls | null = null;

  public modeManager: InteractionModeManager;

  private capture: Capture | null = null;

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
    this.events = new EventEmitter();
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

    topCanvas.style.zIndex = '1';
    topCanvas.style.pointerEvents = 'none';
    this.canvasElement.parentElement?.insertBefore(topCanvas, this.canvasElement);
    this.topCanvas = topCanvas;
  }

  requestRender(): Promise<void> {
    return new Promise((resolve) => {
      requestAnimationFrame(() => {
        this.glCore.clear();

        const allEntities = this.world.getEntities();

        // Update visibility and bounds for dirty entities
        for (const entity of allEntities) {
          if (entity.dirty.dirty) {
            entity.visibility.updateVisibility();
            this.world.updateEntityBounds(entity);
          }
        }

        this.sceneRenderer.render(this.world);
        this.overlayRenderer.render(this.world);

        this.drawing.render();

        // Clear dirty flags
        for (const entity of allEntities) {
          entity.dirty.clearDirty();
        }

        resolve();
      });
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

  set zoom(value: number) {
    this.camera.zoom = value;

    this.requestRender();
  }

  get element(): HTMLCanvasElement {
    return this.canvasElement;
  }

  getActiveGroup(): number | null {
    return this.selectionManager.activeGroup?.id ?? null;
  }

  getSelectedObjects(): Entity[] {
    if (!this.selectionManager.activeGroup) {
      return [];
    }

    return this.selectionManager.activeGroup.hierarchy.children;
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

  toDataURL(
    _options: { quality?: number },
    box: BoundingBox | { entities: Entity[] } = {
      minX: 0,
      minY: 0,
      maxX: this.width,
      maxY: this.height,
    },
  ): Promise<string> {
    return new Promise((resolve) => {
      requestIdleCallback(() => {
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
            console.log(entity.bounds);
            finalBounds.minX = Math.min(finalBounds.minX, entity.bounds.minX);
            finalBounds.minY = Math.min(finalBounds.minY, entity.bounds.minY);
            finalBounds.maxX = Math.max(finalBounds.maxX, entity.bounds.maxX);
            finalBounds.maxY = Math.max(finalBounds.maxY, entity.bounds.maxY);
          }

          console.log(finalBounds);
          bounds = finalBounds;
        } else {
          bounds = box;
        }

        resolve(this.capture.captureRegion(bounds));
      });
    });
  }

  destroy(): void {
    this.events.destroy();
    this.inputHandler.destroy();
    if (this.transformControls) {
      this.transformControls.destroy();
    }
  }
}
