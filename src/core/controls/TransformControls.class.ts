import type { Point } from '../../types';
import type { Canvas } from '../Canvas.class';
import { getDraggable, getLocalMatrix, getWorldMatrix, markDirty, setLocalMatrix, setWorldMatrix } from '../ecs/components';
import { Events } from '../events';
import { m3 } from '../math';
import { InteractionMode, type InteractionModeManager } from '../mode/InteractionModeManager.class';
import { getPointsOfRectangleSquare } from '../utils/getPointsOfRectangleSquare';

type Corner = 'tl' | 'tr' | 'br' | 'bl' | 'mt' | 'ml' | 'mb' | 'mr';

const pivotMap: Record<Corner, number> = { tl: 0, tr: 1, br: 2, bl: 3, mt: 4, ml: 5, mb: 6, mr: 7 };

export class TransformControls {
  private canvas: Canvas;
  private modeManager: InteractionModeManager;
  private activeGroup: number | null = null;
  private activeGroupCorners: Point[] | null = null;

  private dragState: { entityId: number; offset: Point; startPos: Point } | null = null;
  private scaleState: {
    corner: Corner;
    pivot: Point;
    pivotLocal: Point;
    startMatrix: number[];
    startWorldMatrix: number[];
    startMouse: Point;
    startMouseLocal: Point;
  } | null = null;

  private static readonly DRAG_THRESHOLD = 2;
  private static readonly CORNER_HIT_AREA = 10;

  constructor(canvas: Canvas, modeManager: InteractionModeManager) {
    this.canvas = canvas;
    this.modeManager = modeManager;
    this.initListeners();
  }

  private initListeners(): void {
    this.canvas.on(Events.SELECTION_GROUP_ADDED, this.handleSelectionAdded.bind(this));
    this.canvas.on(Events.SELECTION_GROUP_UPDATED, this.handleSelectionUpdated.bind(this));
    this.canvas.on(Events.SELECTION_GROUP_REMOVED, this.handleSelectionRemoved.bind(this));
    this.canvas.on(Events.OBJECT_MODIFIED, this.handleSelectionUpdated.bind(this));
    this.canvas.on(Events.MOUSE_DOWN, this.handleMouseDown.bind(this));
    this.canvas.on(Events.MOUSE_MOVE, this.handleMouseMove.bind(this));
    this.canvas.on(Events.MOUSE_UP, this.handleMouseUp.bind(this));
  }

  private handleSelectionAdded(event: { id: number }): void {
    this.activeGroup = event.id;
    this.updateGroupCorners(event.id);
    this.canvas.requestRender();
  }

  private handleSelectionUpdated(event: { id: number }): void {
    if (this.activeGroup === event.id) {
      this.updateGroupCorners(event.id);
      this.canvas.requestRender();
    }
  }

  private handleSelectionRemoved(): void {
    this.activeGroup = null;
    this.activeGroupCorners = null;
    this.dragState = null;
    this.scaleState = null;
    this.modeManager.reset();
    this.setCursor('default');
    this.canvas.requestRender();
  }

  private updateGroupCorners(groupId: number): void {
    const { screenCorners } = getPointsOfRectangleSquare(this.canvas, groupId, true);
    this.activeGroupCorners = screenCorners;
  }

  private handleMouseDown(event: MouseEvent): void {
    const screenPos = { x: event.offsetX, y: event.offsetY };
    const worldPos = this.canvas.camera.screenToWorld(event.offsetX, event.offsetY);

    const corner = this.getCornerAtPoint(screenPos);
    if (corner && this.activeGroup) {
      this.startScaling(corner, worldPos);
      event.preventDefault();
      return;
    }

    const entity = this.canvas.picker.pick({ point: worldPos })?.[0];
    if (entity && getDraggable(entity)) {
      this.startDragging(entity, worldPos, screenPos);
    }
  }

  private handleMouseMove(event: MouseEvent): void {
    const screenPos = { x: event.offsetX, y: event.offsetY };
    const worldPos = this.canvas.camera.screenToWorld(event.offsetX, event.offsetY);

    if (this.modeManager.isScaling() && this.scaleState) {
      this.updateScaling(worldPos);
      return;
    }

    if (this.modeManager.isDragging() && this.dragState) {
      this.updateDragging(worldPos);
      return;
    }

    if (this.dragState && !this.modeManager.isDragging()) {
      const distance = Math.hypot(screenPos.x - this.dragState.startPos.x, screenPos.y - this.dragState.startPos.y);
      if (distance >= TransformControls.DRAG_THRESHOLD) {
        this.modeManager.setMode(InteractionMode.DRAGGING);
      }
      return;
    }

    if (this.activeGroup) {
      const corner = this.getCornerAtPoint(screenPos);
      this.updateCursorForCorner(corner);
    }
  }

  private handleMouseUp(): void {
    if (this.modeManager.isScaling() || this.modeManager.isDragging()) {
      this.modeManager.reset();
    }

    this.dragState = null;
    this.scaleState = null;

    if (this.activeGroup) {
      this.canvas.requestRender();
    }
  }

  private startScaling(corner: Corner, mouseWorldPos: Point): void {
    if (!this.activeGroup) return;

    const { worldCorners } = getPointsOfRectangleSquare(this.canvas, this.activeGroup, false);
    const diagonalPivotMap: Record<Corner, number> = { tl: 2, tr: 3, br: 0, bl: 1, mt: 6, ml: 7, mb: 4, mr: 5 };
    const pivot = worldCorners[diagonalPivotMap[corner]];

    const startWorldMatrix = getWorldMatrix(this.activeGroup);
    const inverseStartWorld = m3.inverse(startWorldMatrix);
    const pivotLocal = m3.transformPoint(inverseStartWorld, pivot.x, pivot.y);
    const startMouseLocal = m3.transformPoint(inverseStartWorld, mouseWorldPos.x, mouseWorldPos.y);

    this.scaleState = {
      corner,
      pivot,
      pivotLocal,
      startMatrix: [...getLocalMatrix(this.activeGroup)],
      startWorldMatrix: [...startWorldMatrix],
      startMouse: mouseWorldPos,
      startMouseLocal,
    };

    this.modeManager.setMode(InteractionMode.SCALING);
  }

  private updateScaling(mouseWorldPos: Point): void {
    if (!this.scaleState || !this.activeGroup) return;

    const { pivotLocal, startMatrix, startWorldMatrix, startMouseLocal } = this.scaleState;

    const inverseStartWorld = m3.inverse(startWorldMatrix);
    const currentLocal = m3.transformPoint(inverseStartWorld, mouseWorldPos.x, mouseWorldPos.y);

    const startDist = Math.hypot(startMouseLocal.x - pivotLocal.x, startMouseLocal.y - pivotLocal.y);
    const currentDist = Math.hypot(currentLocal.x - pivotLocal.x, currentLocal.y - pivotLocal.y);
    const scale = startDist > 0 ? currentDist / startDist : 1;

    const shouldScaleKeepAspectRatioSame = ['tl', 'tr', 'br', 'bl'].includes(this.scaleState.corner);
    const sideToScale = ['mt', 'mb'].includes(this.scaleState.corner) ? 'y' : 'x';

    const scaleX = shouldScaleKeepAspectRatioSame ? scale : sideToScale === 'x' ? scale : 1;
    const scaleY = shouldScaleKeepAspectRatioSame ? scale : sideToScale === 'y' ? scale : 1;

    const newMatrix = m3.multiply(
      startMatrix,
      m3.translate(pivotLocal.x, pivotLocal.y),
      m3.scale(scaleX, scaleY),
      m3.translate(-pivotLocal.x, -pivotLocal.y),
    );

    setLocalMatrix(this.activeGroup, newMatrix);
    markDirty(this.activeGroup);
    this.updateGroupCorners(this.activeGroup);
    this.canvas.requestRender();
  }

  private startDragging(entityId: number, worldPos: Point, screenPos: Point): void {
    const worldMatrix = getWorldMatrix(entityId);

    this.dragState = {
      entityId,
      startPos: screenPos,
      offset: {
        x: worldPos.x - worldMatrix[6],
        y: worldPos.y - worldMatrix[7],
      },
    };
  }

  private updateDragging(worldPos: Point): void {
    if (!this.dragState) return;

    const { entityId, offset } = this.dragState;
    const worldMatrix = [...getWorldMatrix(entityId)];

    worldMatrix[6] = worldPos.x - offset.x;
    worldMatrix[7] = worldPos.y - offset.y;

    setWorldMatrix(entityId, worldMatrix);
    markDirty(entityId);
    this.canvas.fire(Events.OBJECT_MODIFIED, { id: entityId });
    this.canvas.requestRender();
  }

  private getCornerAtPoint(screenPos: Point): Corner | null {
    const activeGroupCorners = this.activeGroupCorners;

    if (!activeGroupCorners) return null;

    const corners: Array<[Corner, Point]> = Object.entries(pivotMap).map(([corner, index]) => [corner as Corner, activeGroupCorners[index]]);

    for (const [key, point] of corners) {
      const dx = Math.abs(screenPos.x - point.x);
      const dy = Math.abs(screenPos.y - point.y);

      if (dx <= TransformControls.CORNER_HIT_AREA && dy <= TransformControls.CORNER_HIT_AREA) {
        return key;
      }
    }

    return null;
  }

  private updateCursorForCorner(corner: Corner | null): void {
    const cursorMap: Record<Corner, string> = {
      tl: 'nw-resize',
      tr: 'ne-resize',
      br: 'se-resize',
      bl: 'sw-resize',

      mt: 'n-resize',
      ml: 'w-resize',
      mb: 's-resize',
      mr: 'e-resize',
    };

    this.setCursor(corner ? cursorMap[corner] : 'default');
  }

  private setCursor(cursor: string): void {
    if (this.canvas.canvasElement) {
      this.canvas.canvasElement.style.cursor = cursor;
    }
  }

  public destroy(): void {
    this.canvas.off(Events.MOUSE_MOVE, this.handleMouseMove);
    this.canvas.off(Events.MOUSE_DOWN, this.handleMouseDown);
    this.canvas.off(Events.MOUSE_UP, this.handleMouseUp);
    this.canvas.off(Events.SELECTION_GROUP_UPDATED, this.handleSelectionUpdated);
    this.canvas.off(Events.OBJECT_MODIFIED, this.handleSelectionUpdated);
    this.canvas.off(Events.SELECTION_GROUP_ADDED, this.handleSelectionAdded);
    this.canvas.off(Events.SELECTION_GROUP_REMOVED, this.handleSelectionRemoved);
  }
}
