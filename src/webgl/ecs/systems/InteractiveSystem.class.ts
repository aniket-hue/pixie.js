import type { Camera } from '../../Camera.class';
import type { Canvas } from '../../Canvas.class';
import { Events } from '../../events';
import { m3 } from '../../math';
import type { InteractionComponent, Size, Transform } from '../components/types';
import type { World } from '../World.class';

export class InteractiveSystem {
  private world: World;
  private canvas: Canvas;
  private camera: Camera;

  // Interaction state
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
      const interaction = this.world.getComponent<InteractionComponent>('interaction', entity);

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
      this.canvas.fire(Events.RENDER);
    }
  }

  private onMouseUp(): void {
    this.isDragging = false;
    this.draggedEntity = null;
    this.dragOffset = { x: 0, y: 0 };
  }

  private handleDrag(worldX: number, worldY: number): void {
    if (this.draggedEntity !== null) {
      const transform = this.world.getComponent<Transform>('transform', this.draggedEntity);

      if (transform) {
        transform.position.x = worldX - this.dragOffset.x;
        transform.position.y = worldY - this.dragOffset.y;
        this.updateTransformMatrix(this.draggedEntity, transform);
      }
    }
  }

  private calculateDragOffset(entity: number, worldX: number, worldY: number): void {
    const transform = this.world.getComponent<Transform>('transform', entity);
    if (transform) {
      this.dragOffset.x = worldX - transform.position.x;
      this.dragOffset.y = worldY - transform.position.y;
    }
  }

  private updateTransformMatrix(entityId: number, transform: Transform): void {
    const size = this.world.getComponent<Size>('size', entityId);
    if (!size) return;

    const scale = m3.scaling(transform.scale.x * (size.width || 1), transform.scale.y * (size.height || 1));
    const rotation = m3.rotation(transform.rotation);
    const translation = m3.translation(transform.position.x, transform.position.y);

    transform.matrix = m3.multiply(translation, m3.multiply(rotation, scale));
  }

  private findEntityAtPoint(worldX: number, worldY: number): number | null {
    const transformStore = this.world.store<Transform>('transform');
    const sizeStore = this.world.store<Size>('size');
    const interactionStore = this.world.store<InteractionComponent>('interaction');

    // Check entities in reverse order (top to bottom)
    const entities = Array.from(transformStore.keys()).reverse();

    for (const entityId of entities) {
      const transform = transformStore.get(entityId);
      const size = sizeStore.get(entityId);
      const interaction = interactionStore.get(entityId);

      if (!transform || !size || !interaction?.draggable) {
        continue;
      }

      if (this.pointInEntity(worldX, worldY, transform, size)) {
        return entityId;
      }
    }

    return null;
  }

  private pointInEntity(worldX: number, worldY: number, transform: Transform, size: Size): boolean {
    // For rectangles, check if point is within bounds
    if (size.width && size.height) {
      const halfWidth = (size.width * transform.scale.x) / 2;
      const halfHeight = (size.height * transform.scale.y) / 2;

      return (
        worldX >= transform.position.x - halfWidth &&
        worldX <= transform.position.x + halfWidth &&
        worldY >= transform.position.y - halfHeight &&
        worldY <= transform.position.y + halfHeight
      );
    }

    // For circles
    if (size.radius) {
      const dx = worldX - transform.position.x;
      const dy = worldY - transform.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance <= size.radius * Math.max(transform.scale.x, transform.scale.y);
    }

    return false;
  }

  private getWorldPosition(screenX: number, screenY: number): { x: number; y: number } {
    const y = this.canvas.height - screenY; // Flip Y coordinate
    return this.camera.screenToWorld(screenX, y);
  }

  public destroy(): void {
    this.canvas.off(Events.MOUSE_MOVE, this.onMouseMove);
    this.canvas.off(Events.MOUSE_DOWN, this.onMouseDown);
    this.canvas.off(Events.MOUSE_UP, this.onMouseUp);
  }
}
