import RBush from 'rbush';
import { Camera } from './Camera.class';
import { clearAllDirty, getBounds, getHeight, getWidth, getWorldMatrix, isDirty, isVisible } from './ecs/components';
import { BoundsSystem } from './ecs/systems/BoundsSystem.class';
import { ChildrenSystem } from './ecs/systems/ChildrenSystem.class';
import { InteractiveSystem } from './ecs/systems/InteractiveSystem.class';
import { ParentSystem } from './ecs/systems/ParentSystem.class';
import { VisibleSystem } from './ecs/systems/VisibleSystem.class';
import { World } from './ecs/World.class';
import { EventEmitter, type EventKeys } from './events';
import { InputHandler } from './events/input/InputHandler.class';
import { m3 } from './math/matrix';
import { OverlayRenderer } from './OverlayRenderer.class';
import { SceneRenderer } from './SceneRenderer.class';
import { SelectionManager } from './selection/SelectionManager.class';
import { GlCore } from './webgl/GlCore.class';

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
  private parentSystem: ParentSystem;
  private childrenSystem: ChildrenSystem;
  private visibleSystem: VisibleSystem;
  private boundsSystem: BoundsSystem;

  private sceneRenderer: SceneRenderer;
  private overlayRenderer: OverlayRenderer;

  selectionManager: SelectionManager;

  world: World;
  camera: Camera;

  tree: RBush<{
    id: number;
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  }>;

  constructor(canvas: HTMLCanvasElement) {
    this.canvasElement = canvas;

    this.glCore = new GlCore(this.canvasElement);
    this.events = new EventEmitter();
    this.world = new World();
    this.camera = new Camera(this);
    this.inputHandler = new InputHandler(this);

    this.selectionManager = new SelectionManager(this);

    this.interactiveSystem = new InteractiveSystem(this);
    this.parentSystem = new ParentSystem();
    this.childrenSystem = new ChildrenSystem();
    this.visibleSystem = new VisibleSystem();
    this.boundsSystem = new BoundsSystem(this);

    this.sceneRenderer = new SceneRenderer(this);
    this.overlayRenderer = new OverlayRenderer(this);

    this.tree = new RBush();

    this.resize();
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
      this.parentSystem.update(dirtyEntities);
      this.childrenSystem.update(dirtyEntities);
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

  worldToScreen(x: number, y: number): { x: number; y: number } {
    return this.camera.worldToScreen(x, y);
  }

  screenToWorld(x: number, y: number): { x: number; y: number } {
    return this.camera.screenToWorld(x, y);
  }

  setZoom(zoom: number): void {
    this.camera.zoom = zoom;
  }

  getGlCore() {
    return this.glCore;
  }

  findObjectAtPoint(worldX: number, worldY: number): number | null {
    function containsPoint(eid: number, worldX: number, worldY: number) {
      const worldMatrix = getWorldMatrix(eid);
      const inMatrix = m3.inverse(worldMatrix);
      const localPoint = m3.transformPoint(inMatrix, worldX, worldY);

      const w = getWidth(eid);
      const h = getHeight(eid);

      const halfWidth = w * 0.5;
      const halfHeight = h * 0.5;

      return localPoint.x >= -halfWidth && localPoint.x <= halfWidth && localPoint.y >= -halfHeight && localPoint.y <= halfHeight;
    }

    const allIntersecting = [];

    for (const eid of this.world.getEntities()) {
      if (isVisible(eid) && containsPoint(eid, worldX, worldY)) {
        allIntersecting.push(eid);
      }
    }

    return allIntersecting.at(-1) ?? null;
  }

  findEntitiesInBoundingBox(boundingBox: { minX: number; minY: number; maxX: number; maxY: number }): number[] {
    const allIntersecting = [];

    const intersecting = this.tree.search(boundingBox);
    allIntersecting.push(...intersecting.map((item) => item.id));

    return allIntersecting;
  }

  destroy(): void {
    this.events.destroy();
    this.inputHandler.destroy();
    this.interactiveSystem.destroy();
  }
}
