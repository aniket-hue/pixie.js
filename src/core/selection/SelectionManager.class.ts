import { SELECTION_BOX_BORDER_COLOR, SELECTION_BOX_FILL_COLOR } from '../app/colors';
import type { Camera } from '../Camera.class';
import type { Canvas } from '../Canvas.class';
import { getSelectable, markDirty, setHeight, setLocalMatrix, setWidth, setWorldMatrix } from '../ecs/components';
import { clearChildren } from '../ecs/components/children';
import { Events } from '../events';
import { createRectangle } from '../factory';
import { createSelectionGroup } from '../factory/selectionGroup';
import { m3 } from '../math/matrix';
import { createBoundingBoxOfchildren } from '../utils/createBoundingBoxOfchildren';
import { getBoundingBoxFrom2Points } from '../utils/getBoundingBoxFrom2Points';

export class SelectionManager {
  private camera: Camera;
  private canvas: Canvas;

  private selectedEntities: number[] = [];

  private isDragging = false;
  private dragStart: { x: number; y: number } | null = null;

  private group: number | null = null;

  selectionBox: number[] | null = null;
  tempBoundingRect: number | null = null;

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

    if (eid !== null) {
      return;
    }

    if (this.group) {
      clearChildren(this.group);

      this.selectedEntities = [];
      this.canvas.world.removeEntity(this.group);

      this.group = null;
    }

    this.isDragging = true;
    this.dragStart = { x: worldPos.x, y: worldPos.y };

    this.selectionBox = m3.compose({
      tx: worldPos.x,
      ty: worldPos.y,
      sx: 1,
      sy: 1,
      r: 0,
    });

    this.canvas.requestRender();
  }

  private onMouseMove(event: MouseEvent): void {
    if (!this.isDragging || this.dragStart === null) {
      return;
    }

    const currentPos = this.getWorldPosition(event.offsetX, event.offsetY);
    const boundingBox = getBoundingBoxFrom2Points(this.dragStart, currentPos);

    this.selectionBox = m3.compose({
      tx: boundingBox.centerX,
      ty: boundingBox.centerY,
      sx: boundingBox.width,
      sy: boundingBox.height,
      r: 0,
    });

    if (!this.tempBoundingRect) {
      const tempRectFactory = createRectangle({
        x: boundingBox.centerX,
        y: boundingBox.centerY,
        width: boundingBox.width,
        height: boundingBox.height,
        fill: SELECTION_BOX_FILL_COLOR,
        stroke: SELECTION_BOX_BORDER_COLOR,
        strokeWidth: 1.5,
        selectable: false,
        draggable: false,
      });

      this.tempBoundingRect = this.canvas.world.addEntityFactory(tempRectFactory);
    }

    const entities = this.canvas.findEntitiesInBoundingBox(
      { minX: boundingBox.minX, minY: boundingBox.minY, maxX: boundingBox.maxX, maxY: boundingBox.maxY },
      getSelectable,
    );
    const bounds = createBoundingBoxOfchildren(entities);

    setLocalMatrix(this.tempBoundingRect, bounds.localMatrix);
    setWorldMatrix(this.tempBoundingRect, bounds.localMatrix);
    setWidth(this.tempBoundingRect, bounds.width);
    setHeight(this.tempBoundingRect, bounds.height);
    markDirty(this.tempBoundingRect);

    this.selectedEntities = entities;

    this.canvas.requestRender();
  }

  private onMouseUp(): void {
    this.isDragging = false;
    this.selectionBox = null;

    if (this.tempBoundingRect) {
      this.canvas.world.removeEntity(this.tempBoundingRect);
      this.tempBoundingRect = null;
    }

    if (this.selectedEntities.length > 0) {
      this.createGroupFromSelection();
    }

    this.canvas.requestRender();
  }

  private createGroupFromSelection(): void {
    if (this.group) {
      clearChildren(this.group);
      this.canvas.world.removeEntity(this.group);
    }

    const groupFactory = createSelectionGroup({ children: this.selectedEntities });
    this.group = this.canvas.world.addEntityFactory(groupFactory);

    // Reset selection state
    this.selectedEntities = [];
    this.dragStart = null;
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
