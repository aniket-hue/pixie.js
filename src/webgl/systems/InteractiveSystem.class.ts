import type { Camera } from '../Camera.class';
import type { Canvas } from '../Canvas.class';
import type { Object } from '../entities/Object.class';
import { Events } from '../events';
import type { Size } from '../factory/types';
import { m3 } from '../math';
import type { World } from '../World.class';

export class InteractiveSystem {
  private world: World;
  private canvas: Canvas;
  private camera: Camera;

  private draggedObject: Object | null = null;
  private isDragging = false;
  private dragOffset = { x: 0, y: 0 };

  constructor(canvas: Canvas) {
    this.canvas = canvas;
    this.world = canvas.world;
    this.camera = canvas.camera;

    this.initListeners();
  }

  private initListeners(): void {
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);

    this.canvas.on(Events.MOUSE_MOVE, this.onMouseMove);
    this.canvas.on(Events.MOUSE_DOWN, this.onMouseDown);
    this.canvas.on(Events.MOUSE_UP, this.onMouseUp);
  }

  private onMouseDown(event: MouseEvent): void {
    const worldPos = this.getWorldPosition(event.offsetX, event.offsetY);
    const object = this.findObjectAtPoint(worldPos.x, worldPos.y);

    if (object !== null) {
      const isDraggable = object.isDraggable;

      if (isDraggable) {
        this.draggedObject = object;
        this.isDragging = true;

        this.calculateDragOffset(object.x, object.y, worldPos.x, worldPos.y);
      }
    }
  }

  private onMouseMove(event: MouseEvent): void {
    const worldPos = this.getWorldPosition(event.offsetX, event.offsetY);

    if (this.isDragging && this.draggedObject !== null) {
      this.handleDrag(worldPos.x, worldPos.y);
      this.canvas.renderer.requestRender();
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

    this.draggedObject.x = worldX - this.dragOffset.x;
    this.draggedObject.y = worldY - this.dragOffset.y;

    this.world.markDirty(this.draggedObject.entityId);
  }

  private calculateDragOffset(objectX: number, objectY: number, worldX: number, worldY: number): void {
    this.dragOffset.x = worldX - objectX;
    this.dragOffset.y = worldY - objectY;
  }

  private findObjectAtPoint(worldX: number, worldY: number): Object | null {
    for (const object of this.canvas.objects) {
      const transform = object.transformMatrix;
      const size = object.size;
      const isDraggable = object.isDraggable;

      if (!transform || !size || !isDraggable) {
        continue;
      }

      if (this.pointInEntity(worldX, worldY, transform, size)) {
        return object;
      }
    }

    return null;
  }

  private pointInEntity(worldX: number, worldY: number, matrix: number[], size: Size | undefined): boolean {
    if (!size) return false;

    const inMatrix = m3.inverse(matrix);
    const localPoint = m3.transformPoint(inMatrix, worldX, worldY);

    if (size.radius) {
      const distance = Math.sqrt(localPoint.x * localPoint.x + localPoint.y * localPoint.y);
      return distance <= size.radius;
    } else if (size.width && size.height) {
      const halfWidth = size.width * 0.5;
      const halfHeight = size.height * 0.5;

      return localPoint.x >= -halfWidth && localPoint.x <= halfWidth && localPoint.y >= -halfHeight && localPoint.y <= halfHeight;
    }

    return false;
  }

  private getWorldPosition(screenX: number, screenY: number): { x: number; y: number } {
    const y = this.canvas.height - screenY;
    return this.camera.screenToWorld(screenX, y);
  }

  public destroy(): void {
    this.canvas.off(Events.MOUSE_MOVE, this.onMouseMove);
    this.canvas.off(Events.MOUSE_DOWN, this.onMouseDown);
    this.canvas.off(Events.MOUSE_UP, this.onMouseUp);
  }
}
