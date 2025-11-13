import type { Point } from '../../types';
import type { Canvas } from '../Canvas.class';
import { getDraggable, getHeight, getLocalMatrix, getWidth, getWorldMatrix, markDirty, setLocalMatrix, setWorldMatrix } from '../ecs/components';
import { Events } from '../events';
import { m3 } from '../math';
import { InteractionMode, type InteractionModeManager } from '../mode/InteractionModeManager.class';
import { getPointsOfRectangleSquare } from '../utils/getPointsOfRectangleSquare';

type Corner = 'tl' | 'tr' | 'br' | 'bl';

interface ScalingState {
  corner: Corner;
  startMousePos: Point;
  startWorldMatrix: number[];
  startLocalMatrix: number[];
  pivotCorner: Point;
  startDimensions: { width: number; height: number };
}

interface DraggingState {
  entityId: number;
  dragOffset: Point;
}

interface GroupCorners {
  tl: Point;
  tr: Point;
  br: Point;
  bl: Point;
}

export class TransformControls {
  private canvas: Canvas;
  private modeManager: InteractionModeManager;
  private activeGroup: number | null = null;
  private activeGroupCorners: GroupCorners | null = null;

  private scalingState: ScalingState | null = null;
  private draggingState: DraggingState | null = null;

  constructor(canvas: Canvas, modeManager: InteractionModeManager) {
    this.canvas = canvas;
    this.modeManager = modeManager;
    this.initListeners();
  }

  private initListeners(): void {
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.onSelectionGroupUpdated = this.onSelectionGroupUpdated.bind(this);
    this.onSelectionGroupAdded = this.onSelectionGroupAdded.bind(this);
    this.onSelectionGroupRemoved = this.onSelectionGroupRemoved.bind(this);

    this.canvas.on(Events.SELECTION_GROUP_UPDATED, this.onSelectionGroupUpdated);
    this.canvas.on(Events.OBJECT_MODIFIED, this.onSelectionGroupUpdated);
    this.canvas.on(Events.SELECTION_GROUP_ADDED, this.onSelectionGroupAdded);
    this.canvas.on(Events.SELECTION_GROUP_REMOVED, this.onSelectionGroupRemoved);

    this.canvas.on(Events.MOUSE_MOVE, this.onMouseMove);
    this.canvas.on(Events.MOUSE_DOWN, this.onMouseDown);
    this.canvas.on(Events.MOUSE_UP, this.onMouseUp);
  }

  private onSelectionGroupUpdated(event: { id: number }): void {
    if (this.activeGroup !== event.id) {
      return;
    }

    const { screenCorners } = getPointsOfRectangleSquare(this.canvas, event.id, true);
    this.activeGroupCorners = {
      tl: screenCorners[0],
      tr: screenCorners[1],
      br: screenCorners[2],
      bl: screenCorners[3],
    };

    this.canvas.requestRender();
  }

  private onSelectionGroupAdded(event: { id: number }): void {
    this.activeGroup = event.id;

    const { screenCorners } = getPointsOfRectangleSquare(this.canvas, event.id, true);
    this.activeGroupCorners = {
      tl: screenCorners[0],
      tr: screenCorners[1],
      br: screenCorners[2],
      bl: screenCorners[3],
    };

    this.canvas.requestRender();
  }

  private onSelectionGroupRemoved(_event: { id: number }): void {
    this.activeGroupCorners = null;
    this.activeGroup = null;
    this.scalingState = null;
    this.draggingState = null;
    this.modeManager.reset();

    this.canvas.requestRender();
  }

  private isNearCorner(screenPoint: Point, corner: Point): boolean {
    const threshold = 10;
    return (
      screenPoint.x >= corner.x - threshold &&
      screenPoint.x <= corner.x + threshold &&
      screenPoint.y >= corner.y - threshold &&
      screenPoint.y <= corner.y + threshold
    );
  }

  private getCornerAtPoint(screenPoint: Point): Corner | null {
    if (!this.activeGroupCorners) {
      return null;
    }

    const corners: Array<{ key: Corner; point: Point }> = [
      { key: 'tl', point: this.activeGroupCorners.tl },
      { key: 'tr', point: this.activeGroupCorners.tr },
      { key: 'br', point: this.activeGroupCorners.br },
      { key: 'bl', point: this.activeGroupCorners.bl },
    ];

    for (const { key, point } of corners) {
      if (this.isNearCorner(screenPoint, point)) {
        return key;
      }
    }

    return null;
  }

  private updateCursor(hoveredCorner: Corner | null): void {
    if (!this.canvas.canvasElement) {
      return;
    }

    if (hoveredCorner) {
      switch (hoveredCorner) {
        case 'tl':
          this.canvas.canvasElement.style.cursor = 'nw-resize';
          break;
        case 'tr':
          this.canvas.canvasElement.style.cursor = 'ne-resize';
          break;
        case 'br':
          this.canvas.canvasElement.style.cursor = 'se-resize';
          break;
        case 'bl':
          this.canvas.canvasElement.style.cursor = 'sw-resize';
          break;
      }
    } else {
      this.canvas.canvasElement.style.cursor = 'default';
    }
  }

  private onMouseMove(event: MouseEvent): void {
    if (this.modeManager.isScaling()) {
      this.handleScaling(event);
      return;
    }

    if (this.modeManager.isDragging()) {
      this.handleDragging(event);
      return;
    }

    if (this.activeGroup) {
      const screenPoint = { x: event.offsetX, y: event.offsetY };
      const hoveredCorner = this.getCornerAtPoint(screenPoint);
      this.updateCursor(hoveredCorner);
    }
  }

  private onMouseDown(event: MouseEvent): void {
    const screenPoint = { x: event.offsetX, y: event.offsetY };
    const worldPos = this.canvas.camera.screenToWorld(event.offsetX, event.offsetY);

    if (this.activeGroup && this.activeGroupCorners) {
      const clickedCorner = this.getCornerAtPoint(screenPoint);
      if (clickedCorner) {
        this.startScaling(clickedCorner, event);
        event.preventDefault();
        return;
      }
    }

    const pickedEntity = this.canvas.picker.pick({ point: worldPos })?.[0] ?? null;
    if (pickedEntity) {
      const isDraggable = getDraggable(pickedEntity);
      if (isDraggable) {
        this.startDragging(pickedEntity, worldPos);
        event.preventDefault();
        return;
      }
    }
  }

  private onMouseUp(_event: MouseEvent): void {
    if (this.modeManager.isScaling()) {
      this.scalingState = null;
      this.modeManager.reset();
      this.canvas.requestRender();
    } else if (this.modeManager.isDragging()) {
      this.draggingState = null;
      this.modeManager.reset();
    }
  }

  private startScaling(clickedCorner: Corner, event: MouseEvent): void {
    if (!this.activeGroup) {
      return;
    }

    const { worldCorners } = getPointsOfRectangleSquare(this.canvas, this.activeGroup, false);
    const corners = {
      tl: worldCorners[0],
      tr: worldCorners[1],
      br: worldCorners[2],
      bl: worldCorners[3],
    };

    const pivotMap: Record<Corner, Point> = {
      tl: corners.br,
      tr: corners.bl,
      br: corners.tl,
      bl: corners.tr,
    };

    const pivotCorner = pivotMap[clickedCorner];

    const startMouseWorldPos = this.canvas.camera.screenToWorld(event.offsetX, event.offsetY);

    this.scalingState = {
      corner: clickedCorner,
      startMousePos: startMouseWorldPos,
      startWorldMatrix: [...getWorldMatrix(this.activeGroup)],
      startLocalMatrix: [...getLocalMatrix(this.activeGroup)],
      pivotCorner,
      startDimensions: {
        width: getWidth(this.activeGroup),
        height: getHeight(this.activeGroup),
      },
    };

    this.modeManager.setMode(InteractionMode.SCALING);
  }

  private worldToLocalWithMatrix(worldPoint: Point, worldMatrix: number[]): Point {
    const inverseWorld = m3.inverse(worldMatrix);
    return m3.transformPoint(inverseWorld, worldPoint.x, worldPoint.y);
  }

  private handleScaling(event: MouseEvent): void {
    if (!this.scalingState || !this.activeGroup) {
      return;
    }

    const currentMouseWorldPos = this.canvas.camera.screenToWorld(event.offsetX, event.offsetY);
    const { pivotCorner, startWorldMatrix, startLocalMatrix, startMousePos } = this.scalingState;

    const startMouseLocal = this.worldToLocalWithMatrix(startMousePos, startWorldMatrix);
    const currentMouseLocal = this.worldToLocalWithMatrix(currentMouseWorldPos, startWorldMatrix);
    const pivotLocal = this.worldToLocalWithMatrix(pivotCorner, startWorldMatrix);

    const initialDist = Math.hypot(startMouseLocal.x - pivotLocal.x, startMouseLocal.y - pivotLocal.y);
    const currentDist = Math.hypot(currentMouseLocal.x - pivotLocal.x, currentMouseLocal.y - pivotLocal.y);
    const uniformScale = initialDist > 0 ? currentDist / initialDist : 1;

    const translateToPivot = m3.translate(-pivotLocal.x, -pivotLocal.y);
    const scaleMatrix = m3.scale(uniformScale, uniformScale);
    const translateBack = m3.translate(pivotLocal.x, pivotLocal.y);

    const scaledLocalMatrix = m3.multiply(startLocalMatrix, translateBack, scaleMatrix, translateToPivot);

    setLocalMatrix(this.activeGroup, scaledLocalMatrix);
    markDirty(this.activeGroup);

    const { screenCorners } = getPointsOfRectangleSquare(this.canvas, this.activeGroup, true);
    this.activeGroupCorners = {
      tl: screenCorners[0],
      tr: screenCorners[1],
      br: screenCorners[2],
      bl: screenCorners[3],
    };

    this.canvas.requestRender();
  }

  private startDragging(entityId: number, worldPos: Point): void {
    const worldMatrix = getWorldMatrix(entityId);

    this.draggingState = {
      entityId,
      dragOffset: {
        x: worldPos.x - worldMatrix[6],
        y: worldPos.y - worldMatrix[7],
      },
    };

    this.modeManager.setMode(InteractionMode.DRAGGING);
  }

  private handleDragging(event: MouseEvent): void {
    if (!this.draggingState) {
      return;
    }

    const worldPos = this.canvas.camera.screenToWorld(event.offsetX, event.offsetY);
    const { entityId, dragOffset } = this.draggingState;

    const worldMatrix = getWorldMatrix(entityId);
    const newWorldMatrix = [...worldMatrix];
    newWorldMatrix[6] = worldPos.x - dragOffset.x;
    newWorldMatrix[7] = worldPos.y - dragOffset.y;

    setWorldMatrix(entityId, newWorldMatrix);
    markDirty(entityId);

    this.canvas.fire(Events.OBJECT_MODIFIED, { id: entityId });
    this.canvas.requestRender();
  }

  public getActiveGroupCorners(): GroupCorners | null {
    return this.activeGroupCorners;
  }

  public getActiveGroup(): number | null {
    return this.activeGroup;
  }

  public destroy(): void {
    this.canvas.off(Events.MOUSE_MOVE, this.onMouseMove);
    this.canvas.off(Events.MOUSE_DOWN, this.onMouseDown);
    this.canvas.off(Events.MOUSE_UP, this.onMouseUp);
    this.canvas.off(Events.SELECTION_GROUP_UPDATED, this.onSelectionGroupUpdated);
    this.canvas.off(Events.OBJECT_MODIFIED, this.onSelectionGroupUpdated);
    this.canvas.off(Events.SELECTION_GROUP_ADDED, this.onSelectionGroupAdded);
    this.canvas.off(Events.SELECTION_GROUP_REMOVED, this.onSelectionGroupRemoved);
  }
}
