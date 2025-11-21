import type { Point } from '../../types';
import type { Canvas } from '../Canvas.class';
import type { Entity } from '../ecs/base/Entity.class';
import { EventBus, Events } from '../events';
import { m3 } from '../math';
import { InteractionMode, type InteractionModeManager } from '../mode/InteractionModeManager.class';
import { type Corner, diagonalPivotMap, getPointsOfRectangleSquare } from '../utils/getPointsOfRectangleSquare';
import type { DragState, RotateState, ScaleState } from './types';

const CONSTANTS = {
  DRAG_THRESHOLD: 2,
  CORNER_HIT_AREA: 10,
} as const;

const CURSOR_MAP: Record<Corner, string> = {
  tl: 'nw-resize',
  tr: 'ne-resize',
  br: 'se-resize',
  bl: 'sw-resize',
  mt: 'n-resize',
  ml: 'w-resize',
  mb: 's-resize',
  mr: 'e-resize',
  rotate: 'grab',
  center: 'grab',
};

export class TransformControls {
  private canvas: Canvas;
  private modeManager: InteractionModeManager;
  private activeGroup: Entity | null = null;
  private activeGroupCorners: Record<Corner, Point> | null = null;

  private dragState: DragState | null = null;
  private scaleState: ScaleState | null = null;
  private rotateState: RotateState | null = null;

  constructor(canvas: Canvas, modeManager: InteractionModeManager) {
    this.canvas = canvas;
    this.modeManager = modeManager;
    this.initListeners();
  }

  private initListeners(): void {
    const listeners = [
      [Events.SELECTION_GROUP_ADDED, this.handleSelectionAdded],
      [Events.SELECTION_GROUP_UPDATED, this.handleSelectionUpdated],
      [Events.ZOOM_CHANGED, this.handleZoomChanged],
      [Events.SELECTION_GROUP_REMOVED, this.handleSelectionRemoved],
      [Events.OBJECT_MODIFIED, this.handleSelectionUpdated],
      [Events.MOUSE_DOWN, this.handleMouseDown],
      [Events.MOUSE_MOVE, this.handleMouseMove],
      [Events.MOUSE_UP, this.handleMouseUp],
    ] as const;

    listeners.forEach(([event, handler]) => {
      EventBus.on(event, handler.bind(this));
    });
  }

  private handleZoomChanged(): void {
    if (!this.activeGroup) return;

    this.updateGroupCorners(this.activeGroup);
    this.canvas.requestRender();
  }

  private handleSelectionAdded(event: { id: number }): void {
    const entity = this.canvas.world.getEntityById(event.id);

    if (entity) {
      this.activeGroup = entity;
      this.updateGroupCorners(entity);
      this.canvas.requestRender();
    }
  }

  private handleSelectionUpdated(event: { id: number }): void {
    if (this.activeGroup?.id === event.id) {
      this.updateGroupCorners(this.activeGroup);
      this.canvas.requestRender();
    }
  }

  private handleSelectionRemoved(): void {
    this.resetState();
    this.canvas.requestRender();
  }

  private resetState(): void {
    this.activeGroup = null;
    this.activeGroupCorners = null;
    this.dragState = null;
    this.scaleState = null;
    this.rotateState = null;
    this.modeManager.reset();
    this.setCursor('default');
  }

  private updateGroupCorners(group: Entity): void {
    const { screenCorners } = getPointsOfRectangleSquare(this.canvas, group, true);
    this.activeGroupCorners = screenCorners;
  }

  private handleMouseDown(event: MouseEvent): void {
    const screenPos = { x: event.offsetX, y: event.offsetY };
    const worldPos = this.canvas.camera.screenToWorld(event.offsetX, event.offsetY);
    const corner = this.getCornerAtPoint(screenPos);

    if (corner === 'center') {
      return;
    }

    if (corner === 'rotate') {
      this.startRotating();
      event.preventDefault();
      return;
    }

    if (corner) {
      this.startScaling(corner, worldPos);
      event.preventDefault();
      return;
    }

    const entity = this.canvas.picker.pick({ point: worldPos })?.[0];

    if (entity && this.activeGroup?.hierarchy.doesChildBelongToGroup(entity) && entity.interaction.draggable) {
      /**
       * If there is no active group, we're dragging the entity directly.
       */
      this.startDragging(this.activeGroup || entity, worldPos, screenPos);
    }
  }

  private handleMouseMove(event: MouseEvent): void {
    const screenPos = { x: event.offsetX, y: event.offsetY };
    const worldPos = this.canvas.camera.screenToWorld(event.offsetX, event.offsetY);

    if (this.modeManager.isRotating() && this.rotateState) {
      this.updateRotating(event, worldPos);

      return;
    }

    if (this.modeManager.isScaling() && this.scaleState) {
      this.updateScaling(event, worldPos);

      return;
    }

    if (this.modeManager.isDragging() && this.dragState) {
      this.updateDragging(worldPos);

      return;
    }

    if (this.dragState && !this.modeManager.isDragging()) {
      const distance = Math.hypot(screenPos.x - this.dragState.startPos.x, screenPos.y - this.dragState.startPos.y);

      if (distance >= CONSTANTS.DRAG_THRESHOLD) {
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
    if (this.modeManager.isScaling() || this.modeManager.isDragging() || this.modeManager.isRotating()) {
      this.modeManager.reset();
    }

    this.dragState = null;
    this.scaleState = null;
    this.rotateState = null;

    if (this.activeGroup) {
      this.canvas.requestRender();
    }
  }

  private startRotating(): void {
    if (!this.activeGroup) return;

    this.modeManager.setMode(InteractionMode.ROTATING);
    const { worldCorners } = getPointsOfRectangleSquare(this.canvas, this.activeGroup, false);
    const center = worldCorners.center;

    const worldMatrix = this.activeGroup.matrix.getWorldMatrix();
    const inverseWorldMatrix = m3.inverse(worldMatrix);

    const localMatrix = this.activeGroup.matrix.getLocalMatrix();
    const decomposedLocal = m3.decompose(localMatrix);
    const inverseLocalMatrix = m3.inverse(localMatrix);

    const centerLocal = m3.transformPoint(inverseWorldMatrix, center.x, center.y);

    this.rotateState = {
      centerLocal,
      inverseLocalMatrix,
      startAngle: decomposedLocal.rotation + Math.PI / 2,
      decomposedLocal,
    };
  }

  private updateRotating(_event: MouseEvent, mouseWorldPos: Point): void {
    if (!this.rotateState || !this.activeGroup) return;

    const { centerLocal, inverseLocalMatrix, decomposedLocal, startAngle } = this.rotateState;

    const currentMouseLocal = m3.transformPoint(inverseLocalMatrix, mouseWorldPos.x, mouseWorldPos.y);

    const currentAngle = Math.atan2(currentMouseLocal.y - centerLocal.y, currentMouseLocal.x - centerLocal.x);

    const deltaAngle = currentAngle - startAngle;
    const newRotation = decomposedLocal.rotation + deltaAngle;

    const finalMatrix = m3.compose({
      tx: decomposedLocal.tx,
      ty: decomposedLocal.ty,
      sx: decomposedLocal.scaleX,
      sy: decomposedLocal.scaleY,
      r: newRotation,
    });

    this.activeGroup.matrix.setLocalMatrix(finalMatrix);
    this.activeGroup.matrix.setWorldMatrix();

    this.activeGroup.dirty.markDirty();
    this.updateGroupCorners(this.activeGroup);
    this.canvas.requestRender();
  }

  private startScaling(corner: Corner, mouseWorldPos: Point): void {
    if (!this.activeGroup) return;

    this.modeManager.setMode(InteractionMode.SCALING);

    const { worldCorners } = getPointsOfRectangleSquare(this.canvas, this.activeGroup, false);
    const pivot = worldCorners[diagonalPivotMap[corner]];

    const worldMatrix = this.activeGroup.matrix.getWorldMatrix();
    const localMatrix = this.activeGroup.matrix.getLocalMatrix();
    const inverseWorldMatrix = m3.inverse(worldMatrix);

    const pivotLocal = m3.transformPoint(inverseWorldMatrix, pivot.x, pivot.y);
    const startMouseLocal = m3.transformPoint(inverseWorldMatrix, mouseWorldPos.x, mouseWorldPos.y);

    const startDistX = startMouseLocal.x - pivotLocal.x;
    const startDistY = startMouseLocal.y - pivotLocal.y;

    this.scaleState = {
      corner,
      pivotLocal,
      localMatrix,
      inverseWorldMatrix,
      startDistX,
      startDistY,
    };
  }

  private updateScaling(event: MouseEvent, mouseWorldPos: Point): void {
    if (!this.scaleState || !this.activeGroup) return;

    const { pivotLocal, localMatrix, inverseWorldMatrix, startDistX, startDistY, corner } = this.scaleState;

    const currentLocal = m3.transformPoint(inverseWorldMatrix, mouseWorldPos.x, mouseWorldPos.y);

    const currentDistX = currentLocal.x - pivotLocal.x;
    const currentDistY = currentLocal.y - pivotLocal.y;

    const doesEffectY = ['tl', 'tr', 'bl', 'br', 'mt', 'mb'].includes(corner);
    const doesEffectX = ['tl', 'tr', 'bl', 'br', 'ml', 'mr'].includes(corner);

    let scaleX = startDistX === 0 ? 1 : currentDistX / startDistX;
    let scaleY = startDistY === 0 ? 1 : currentDistY / startDistY;

    if (!doesEffectY) {
      scaleY = 1;
    }

    if (!doesEffectX) {
      scaleX = 1;
    }

    if (event.shiftKey) {
      scaleX = scaleY;
      scaleY = scaleX;
    }

    const newMatrix = m3.multiply(
      localMatrix,
      m3.translate(pivotLocal.x, pivotLocal.y),
      m3.scale(scaleX, scaleY),
      m3.translate(-pivotLocal.x, -pivotLocal.y),
    );

    this.activeGroup.matrix.setLocalMatrix(newMatrix);
    this.activeGroup.matrix.setWorldMatrix();

    this.activeGroup.dirty.markDirty();
    this.updateGroupCorners(this.activeGroup);

    this.canvas.requestRender();
  }

  private startDragging(entity: Entity, worldPos: Point, screenPos: Point): void {
    const localMatrix = entity.matrix.getLocalMatrix();

    this.dragState = {
      entityId: entity.id,
      entity,
      startPos: screenPos,
      offset: {
        x: worldPos.x - localMatrix[6],
        y: worldPos.y - localMatrix[7],
      },
    };
  }

  private updateDragging(worldPos: Point): void {
    if (!this.dragState) return;

    const { entity, offset } = this.dragState;
    const localMatrix = entity.matrix.getLocalMatrix();

    localMatrix[6] = worldPos.x - offset.x;
    localMatrix[7] = worldPos.y - offset.y;

    entity.matrix.setLocalMatrix(localMatrix);
    entity.matrix.setWorldMatrix();

    this.canvas.fire(Events.OBJECT_MODIFIED, { id: entity.id });
    this.canvas.requestRender();
  }

  private getCornerAtPoint(screenPos: Point): Corner | null {
    if (!this.activeGroupCorners) return null;

    const corners = Object.entries(this.activeGroupCorners).filter(([key]) => key !== 'center') as [Corner, Point][];

    for (const [key, point] of corners) {
      const finalPoint = point;

      if (this.isPointNearCorner(screenPos, finalPoint)) {
        return key;
      }
    }

    return null;
  }

  private isPointNearCorner(pos: Point, corner: Point): boolean {
    const dx = Math.abs(pos.x - corner.x);
    const dy = Math.abs(pos.y - corner.y);
    return dx <= CONSTANTS.CORNER_HIT_AREA && dy <= CONSTANTS.CORNER_HIT_AREA;
  }

  private updateCursorForCorner(corner: Corner | null): void {
    this.setCursor(corner ? CURSOR_MAP[corner] : 'default');
  }

  private setCursor(cursor: string): void {
    if (this.canvas.canvasElement) {
      this.canvas.canvasElement.style.cursor = cursor;
    }
  }

  public destroy(): void {
    const listeners = [
      [Events.MOUSE_MOVE, this.handleMouseMove],
      [Events.MOUSE_DOWN, this.handleMouseDown],
      [Events.MOUSE_UP, this.handleMouseUp],
      [Events.SELECTION_GROUP_UPDATED, this.handleSelectionUpdated],
      [Events.OBJECT_MODIFIED, this.handleSelectionUpdated],
      [Events.SELECTION_GROUP_ADDED, this.handleSelectionAdded],
      [Events.SELECTION_GROUP_REMOVED, this.handleSelectionRemoved],
    ] as const;

    listeners.forEach(([event, handler]) => {
      EventBus.off(event, handler);
    });
  }
}
