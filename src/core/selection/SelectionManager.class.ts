import type { Camera } from '../Camera.class';
import type { Canvas } from '../Canvas.class';
import { updateSelectable } from '../ecs/components';
import { Events } from '../events';
import { PRIMARY_MODIFIER_KEY } from '../events/input/constants';
import { m3 } from '../math/matrix';

export class SelectionManager {
  private camera: Camera;
  private canvas: Canvas;

  private selectedEntities: number[] = [];

  private isSingleSelection = true;
  private isDragging = false;
  private dragStart: { x: number; y: number } | null = null;

  selectionBox: number[] | null = null;

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
    this.isSingleSelection = event[PRIMARY_MODIFIER_KEY] === false;

    const worldPos = this.getWorldPosition(event.offsetX, event.offsetY);
    const eid = this.canvas.findObjectAtPoint(worldPos.x, worldPos.y);

    if (this.isSingleSelection) {
      this.deselectAll();
    }

    if (eid === null) {
      this.isDragging = true;
      this.dragStart = { x: worldPos.x, y: worldPos.y };

      // Initial selection box (very small, at start position)
      this.selectionBox = m3.compose({
        tx: worldPos.x,
        ty: worldPos.y,
        sx: 1,
        sy: 1,
        r: 0,
      });
      this.canvas.requestRender();

      return;
    }

    this.selectedEntities.push(eid);
    this.canvas.requestRender();
  }

  private onMouseMove(event: MouseEvent): void {
    if (this.isDragging && this.dragStart !== null) {
      const currentPos = this.getWorldPosition(event.offsetX, event.offsetY);

      const minX = Math.min(this.dragStart.x, currentPos.x);
      const maxX = Math.max(this.dragStart.x, currentPos.x);
      const minY = Math.min(this.dragStart.y, currentPos.y);
      const maxY = Math.max(this.dragStart.y, currentPos.y);

      const width = maxX - minX;
      const height = maxY - minY;

      const centerX = minX + width / 2;
      const centerY = minY + height / 2;

      this.selectionBox = m3.compose({
        tx: centerX,
        ty: centerY,
        sx: width,
        sy: height,
        r: 0,
      });

      this.canvas.requestRender();
    }
  }

  private onMouseUp(): void {
    this.isDragging = false;
    this.selectionBox = null;
    this.canvas.requestRender();
  }

  private getWorldPosition(screenX: number, screenY: number): { x: number; y: number } {
    const y = this.canvas.height - screenY;
    return this.camera.screenToWorld(screenX, y);
  }

  private deselectAll(): void {
    this.selectedEntities.forEach((selectedEntity) => {
      updateSelectable(selectedEntity, false);
    });

    this.selectedEntities = [];
  }

  public destroy(): void {
    this.canvas.off(Events.MOUSE_MOVE, this.onMouseMove);
    this.canvas.off(Events.MOUSE_DOWN, this.onMouseDown);
    this.canvas.off(Events.MOUSE_UP, this.onMouseUp);
  }
}
