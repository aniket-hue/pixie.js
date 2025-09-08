import type { Camera } from '../../Camera.class';
import type { Canvas } from '../../Canvas.class';
import { Events } from '../../events';
import { m3 } from '../../math';
import type { Bounds, Interaction, Size, Transform } from '../components/types';
import type { World } from '../World.class';

export class InteractiveSystem {
  private world: World;
  private canvas: Canvas;
  private camera: Camera;

  private draggedEntity: number | null = null;
  private isDragging = false;
  private dragOffset = { x: 0, y: 0 };

  constructor(world: World, canvas: Canvas, camera: Camera) {
    this.world = world;
    this.canvas = canvas;
    this.camera = camera;

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
    const entity = this.findEntityAtPoint(worldPos.x, worldPos.y);

    if (entity !== null) {
      const interaction = this.world.getComponent<Interaction>('interaction', entity);

      if (interaction?.draggable) {
        this.draggedEntity = entity;
        this.isDragging = true;
        this.calculateDragOffset(entity, worldPos.x, worldPos.y);
      }
    }
  }

  private onMouseMove(event: MouseEvent): void {
    const worldPos = this.getWorldPosition(event.offsetX, event.offsetY);
    if (this.isDragging && this.draggedEntity !== null) {
      this.handleDrag(worldPos.x, worldPos.y);
      this.canvas.renderer.requestRender();
    }
  }

  private onMouseUp(): void {
    this.isDragging = false;
    this.draggedEntity = null;
    this.dragOffset = { x: 0, y: 0 };
  }

  private handleDrag(worldX: number, worldY: number): void {
    if (this.draggedEntity !== null) {
      const entities = [this.draggedEntity];

      entities.forEach((child) => {
        this.world.updateComponent<Transform>('transform', child, {
          position: {
            x: worldX - this.dragOffset.x,
            y: worldY - this.dragOffset.y,
          },
        });
      });
    }
  }

  private calculateDragOffset(entity: number, worldX: number, worldY: number): void {
    const transform = this.world.getComponent<Transform>('transform', entity);

    if (transform) {
      this.dragOffset.x = worldX - transform.position.x;
      this.dragOffset.y = worldY - transform.position.y;
    }
  }

  private findEntityAtPoint(worldX: number, worldY: number): number | null {
    const boundsStore = this.world.store<Bounds>('bounds');
    const sizeStore = this.world.store<Size>('size');
    const interactionStore = this.world.store<Interaction>('interaction');

    const entities = Array.from(boundsStore.keys()).reverse();

    for (const entityId of entities) {
      const bounds = boundsStore.get(entityId);
      const size = sizeStore.get(entityId);
      const interaction = interactionStore.get(entityId);

      if (!bounds || !interaction?.draggable) {
        continue;
      }

      if (this.pointInEntity(worldX, worldY, bounds, size)) {
        return entityId;
      }
    }

    return null;
  }

  private pointInEntity(worldX: number, worldY: number, bounds: Bounds, size: Size | undefined): boolean {
    if (!size) return false;

    const matrix = bounds.matrix;
    const inMatrix = m3.inverse(matrix);
    const localPoint = m3.transformPoint(inMatrix, worldX, worldY);

    if (size.radius) {
      // Circle collision - use radius
      const distance = Math.sqrt(localPoint.x * localPoint.x + localPoint.y * localPoint.y);
      return distance <= size.radius;
    } else if (size.width && size.height) {
      // Rectangle collision - use actual dimensions
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
