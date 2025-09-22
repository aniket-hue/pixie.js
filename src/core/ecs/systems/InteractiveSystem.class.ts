import type { Camera } from '../../Camera.class';
import type { Canvas } from '../../Canvas.class';
import { Events } from '../../events';
import { getDraggable, getWorldMatrix, markDirty, setSelectable, setWorldMatrix } from '../components';

export class InteractiveSystem {
  private camera: Camera;
  private canvas: Canvas;

  private draggedObject: number | null = null;
  private isDragging = false;
  private dragOffset = { x: 0, y: 0 };
  private selectedEntities: number[] = [];

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
    const worldPos = this.getWorldPosition(event.offsetX, event.offsetY);
    const eid = this.canvas.findObjectAtPoint(worldPos.x, worldPos.y);

    this.deselectAll();

    if (eid === null) {
      this.canvas.requestRender();

      return;
    }

    setSelectable(eid, true);
    this.selectedEntities.push(eid);
    this.canvas.requestRender();

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
    const worldPos = this.getWorldPosition(event.offsetX, event.offsetY);

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
    worldMatrix[6] = worldX - this.dragOffset.x;
    worldMatrix[7] = worldY - this.dragOffset.y;

    setWorldMatrix(this.draggedObject, worldMatrix);
  }

  private getWorldPosition(screenX: number, screenY: number): { x: number; y: number } {
    const y = this.canvas.height - screenY;
    return this.camera.screenToWorld(screenX, y);
  }

  private deselectAll(): void {
    this.selectedEntities.forEach((selectedEntity) => {
      setSelectable(selectedEntity, false);
    });

    this.selectedEntities = [];
  }

  public destroy(): void {
    this.canvas.off(Events.MOUSE_MOVE, this.onMouseMove);
    this.canvas.off(Events.MOUSE_DOWN, this.onMouseDown);
    this.canvas.off(Events.MOUSE_UP, this.onMouseUp);
  }
}
