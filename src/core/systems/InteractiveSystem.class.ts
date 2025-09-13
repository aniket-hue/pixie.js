import type { Camera } from '../Camera.class';
import type { Object } from '../entities/Object.class';
import { Events } from '../events';
import type { GraphicsEngine } from '../GraphicsEngine.class';
import { m3 } from '../math';
import type { World } from '../world/World.class';

export class InteractiveSystem {
  private world: World;
  private context: GraphicsEngine;
  private camera: Camera;

  private draggedObject: Object | null = null;
  private isDragging = false;
  private dragOffset = { x: 0, y: 0 };
  private selectedObjects: Object[] = [];

  constructor(context: GraphicsEngine) {
    this.context = context;
    this.world = context.world;
    this.camera = context.camera;

    this.initListeners();
  }

  private initListeners(): void {
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);

    this.context.on(Events.MOUSE_MOVE, this.onMouseMove);
    this.context.on(Events.MOUSE_DOWN, this.onMouseDown);
    this.context.on(Events.MOUSE_UP, this.onMouseUp);
  }

  private onMouseDown(event: MouseEvent): void {
    const worldPos = this.getWorldPosition(event.offsetX, event.offsetY);
    const object = this.context.scene.findObjectAtPoint(worldPos.x, worldPos.y);

    this.deselectAll();

    if (object === null) {
      this.context.requestRender();

      return;
    }

    object.selected = true;
    this.selectedObjects = [...this.selectedObjects, object];
    this.world.markDirty(object.entityId);
    this.context.requestRender();

    const isDraggable = object.isDraggable;

    if (!isDraggable) {
      return;
    }

    this.draggedObject = object;
    this.isDragging = true;

    this.dragOffset.x = worldPos.x - object.x;
    this.dragOffset.y = worldPos.y - object.y;
  }

  private onMouseMove(event: MouseEvent): void {
    const worldPos = this.getWorldPosition(event.offsetX, event.offsetY);

    if (this.isDragging && this.draggedObject !== null) {
      this.handleDrag(worldPos.x, worldPos.y);

      this.world.markDirty(this.draggedObject.entityId);

      this.context.requestRender();
    }
  }

  private onMouseUp(): void {
    this.isDragging = false;
    this.draggedObject = null;
    this.dragOffset = { x: 0, y: 0 };
  }

  private handleDrag(worldX: number, worldY: number): void {
    if (this.draggedObject === null) {
      return;
    }

    this.draggedObject.x = worldX;
    this.draggedObject.y = worldY;
  }

  private getWorldPosition(screenX: number, screenY: number): { x: number; y: number } {
    const y = this.context.height - screenY;
    return this.camera.screenToWorld(screenX, y);
  }

  private deselectAll(): void {
    this.selectedObjects.forEach((selectedObject) => {
      selectedObject.selected = false;
      this.world.markDirty(selectedObject.entityId);
    });

    this.selectedObjects = [];
  }

  public destroy(): void {
    this.context.off(Events.MOUSE_MOVE, this.onMouseMove);
    this.context.off(Events.MOUSE_DOWN, this.onMouseDown);
    this.context.off(Events.MOUSE_UP, this.onMouseUp);
  }
}
