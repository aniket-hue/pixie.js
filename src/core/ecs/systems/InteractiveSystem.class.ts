import type { Camera } from '../../Camera.class';
import type { Canvas } from '../../Canvas.class';
import { Events } from '../../events';
import { getDraggable, getLocalMatrix, getWorldMatrix, markDirty, setLocalMatrix, setWorldMatrix } from '../components';

export class InteractiveSystem {
  private camera: Camera;
  private canvas: Canvas;

  private draggedObject: number | null = null;
  private isDragging = false;
  private dragOffset = { x: 0, y: 0 };

  constructor(context: Canvas) {
    this.canvas = context;
    this.camera = context.camera;

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
    const worldPos = this.camera.screenToWorld(event.offsetX, event.offsetY);
    const eid = this.canvas.picker.pick({ point: worldPos })?.[0] ?? null;

    if (!eid) {
      return;
    }

    const isDraggable = getDraggable(eid);

    if (!isDraggable) {
      return;
    }

    this.draggedObject = eid;
    this.isDragging = true;

    const worldMatrix = getWorldMatrix(eid);

    this.dragOffset.x = worldPos.x - worldMatrix[6];
    this.dragOffset.y = worldPos.y - worldMatrix[7];
  }

  private onMouseMove(event: MouseEvent): void {
    const worldPos = this.camera.screenToWorld(event.offsetX, event.offsetY);

    if (this.isDragging && this.draggedObject !== null) {
      this.handleDrag(worldPos.x, worldPos.y);

      markDirty(this.draggedObject);

      this.canvas.requestRender();
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

    const worldMatrix = getWorldMatrix(this.draggedObject);
    const localMatrix = getLocalMatrix(this.draggedObject);

    localMatrix[6] = worldX - this.dragOffset.x;
    localMatrix[7] = worldY - this.dragOffset.y;

    worldMatrix[6] = worldX - this.dragOffset.x;
    worldMatrix[7] = worldY - this.dragOffset.y;

    setWorldMatrix(this.draggedObject, worldMatrix);
    setLocalMatrix(this.draggedObject, localMatrix);

    this.canvas.fire(Events.OBJECT_MODIFIED, { id: this.draggedObject });
  }

  public destroy(): void {
    this.canvas.off(Events.MOUSE_MOVE, this.onMouseMove);
    this.canvas.off(Events.MOUSE_DOWN, this.onMouseDown);
    this.canvas.off(Events.MOUSE_UP, this.onMouseUp);
  }
}
