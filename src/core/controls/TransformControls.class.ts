import type { Point } from "../../types";
import type { Canvas } from "../Canvas.class";
import type { Entity } from "../ecs/base/Entity.class";
import { Events, type EventKeys, type EventMap } from "../events";
import { m3 } from "../lib/math";
import {
  InteractionMode,
  type InteractionModeManager,
} from "../mode/InteractionModeManager.class";
import { selectionTarget } from "../selection/SelectionManager.class";
import { type Corner, diagonalPivotMap, getPointsOfRectangleSquare } from "../utils/getPointsOfRectangleSquare";
import { containsPoint, setWorldTransform } from "../utils/shapes";
import type { DragState, RotateState, ScaleState } from "./types";

const CONSTANTS = {
  DRAG_THRESHOLD: 2,
  CORNER_HIT_AREA: 10,
} as const;

const CURSOR_MAP: Record<Corner, string> = {
  tl: "nw-resize",
  tr: "ne-resize",
  br: "se-resize",
  bl: "sw-resize",
  mt: "n-resize",
  ml: "w-resize",
  mb: "s-resize",
  mr: "e-resize",
  rotate: "grab",
  center: "grab",
};

export class TransformControls {
  private canvas: Canvas;
  private modeManager: InteractionModeManager;
  private frame: Entity | null = null;

  private dragState: DragState | null = null;
  private scaleState: ScaleState | null = null;
  private rotateState: RotateState | null = null;
  private unsubscribers: Array<() => void> = [];

  constructor(canvas: Canvas, modeManager: InteractionModeManager) {
    this.canvas = canvas;
    this.modeManager = modeManager;
    this.initListeners();
  }

  private initListeners(): void {
    this.listen(
      Events.SELECTION_CHANGED,
      this.handleSelectionChanged.bind(this),
    );
    this.listen(Events.POINTER_DOWN, this.handleMouseDown.bind(this));
    this.listen(Events.POINTER_MOVE, this.handleMouseMove.bind(this));
    this.listen(Events.POINTER_UP, this.handleMouseUp.bind(this));
  }

  private listen<K extends EventKeys>(
    event: K,
    handler: (...args: EventMap[K]) => void,
  ): void {
    this.canvas.on(event, handler);
    this.unsubscribers.push(() => this.canvas.off(event, handler));
  }

  private modified(target: Entity): void {
    const entities =
      target === this.frame ? this.canvas.selectionManager.selected : [target];
    this.canvas.fire(Events.OBJECT_MODIFIED, entities);
  }

  private get selection() {
    return this.canvas.selectionManager;
  }

  private handleSelectionChanged(): void {
    this.frame = this.selection.frame;

    if (!this.frame) {
      this.resetState();
    }
  }

  private resetState(): void {
    this.frame = null;
    this.dragState = null;
    this.scaleState = null;
    this.rotateState = null;
    this.modeManager.reset();
    this.setCursor("default");
  }

  private handleMouseDown(event: MouseEvent): void {
    if (this.modeManager.isDrawing()) return;

    const screenPos = { x: event.offsetX, y: event.offsetY };
    const worldPos = this.canvas.camera.screenToWorld(
      event.offsetX,
      event.offsetY,
    );
    const corner = this.handleAt(screenPos);

    if (corner === "center") {
      return;
    }

    if (corner === "rotate") {
      this.startRotating(worldPos);
      event.preventDefault();
      return;
    }

    if (corner) {
      this.startScaling(corner, worldPos);
      event.preventDefault();
      return;
    }

    const frame = this.frame;
    const onFrame = frame && containsPoint(frame, worldPos) ? frame : undefined;
    // Pressing a gap inside the selection bounds still drags the selection.
    const entity =
      this.canvas.query(
        { point: worldPos },
        (candidate) => candidate.visibility.visible,
      )[0] ?? onFrame;

    if (entity?.interaction.draggable) {
      this.dragState = {
        entity,
        startPos: screenPos,
        startWorld: worldPos,
        startMatrix: null,
      };
    }
  }

  private dragTarget(entity: Entity): Entity | null {
    const frame = this.frame;

    if (frame && (entity === frame || this.selection.isSelected(entity))) {
      return frame;
    }

    if (selectionTarget(entity)) {
      return null;
    }

    return entity;
  }

  private handleMouseMove(event: MouseEvent): void {
    const screenPos = { x: event.offsetX, y: event.offsetY };
    const worldPos = this.canvas.camera.screenToWorld(
      event.offsetX,
      event.offsetY,
    );

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
      const distance = Math.hypot(
        screenPos.x - this.dragState.startPos.x,
        screenPos.y - this.dragState.startPos.y,
      );

      if (distance >= CONSTANTS.DRAG_THRESHOLD) {
        this.startDragging(this.dragState);
      }

      return;
    }

    if (this.frame) {
      const corner = this.handleAt(screenPos);

      this.updateCursorForCorner(corner);
    }
  }

  private handleMouseUp(): void {
    if (
      this.modeManager.isScaling() ||
      this.modeManager.isDragging() ||
      this.modeManager.isRotating()
    ) {
      this.modeManager.reset();
      this.selection.endTransform();
    }

    this.dragState = null;
    this.scaleState = null;
    this.rotateState = null;

    if (this.frame) {
      this.canvas.requestRender("TransformControls.mouseUp");
    }
  }

  private startRotating(mouseWorldPos: Point): void {
    if (!this.frame) return;

    this.modeManager.setMode(InteractionMode.ROTATING);
    this.selection.beginTransform();

    const { worldCorners } = getPointsOfRectangleSquare(
      this.canvas,
      this.frame,
      false,
    );
    const center = worldCorners.center;

    const inverseWorldMatrix = m3.inverse(this.frame.matrix.getWorldMatrix());
    const decomposedLocal = m3.decompose(this.frame.matrix.getLocalMatrix());

    const centerLocal = m3.transformPoint(
      inverseWorldMatrix,
      center.x,
      center.y,
    );
    const startMouseLocal = m3.transformPoint(
      inverseWorldMatrix,
      mouseWorldPos.x,
      mouseWorldPos.y,
    );

    const startAngle = Math.atan2(
      startMouseLocal.y - centerLocal.y,
      startMouseLocal.x - centerLocal.x,
    );

    this.rotateState = {
      centerLocal,
      inverseWorldMatrix,
      startAngle,
      decomposedLocal,
    };
  }

  private updateRotating(_event: MouseEvent, mouseWorldPos: Point): void {
    if (!this.rotateState || !this.frame) return;

    const { centerLocal, inverseWorldMatrix, decomposedLocal, startAngle } =
      this.rotateState;

    const currentMouseLocal = m3.transformPoint(
      inverseWorldMatrix,
      mouseWorldPos.x,
      mouseWorldPos.y,
    );

    const currentAngle = Math.atan2(
      currentMouseLocal.y - centerLocal.y,
      currentMouseLocal.x - centerLocal.x,
    );

    const deltaAngle = currentAngle - startAngle;
    const newRotation = decomposedLocal.rotation + deltaAngle;

    const finalMatrix = m3.compose({
      tx: decomposedLocal.tx,
      ty: decomposedLocal.ty,
      sx: decomposedLocal.scaleX,
      sy: decomposedLocal.scaleY,
      r: newRotation,
    });

    this.frame.matrix.setLocalMatrix(finalMatrix);
    this.frame.matrix.setWorldMatrix();
    this.selection.applyTransform();

    this.modified(this.frame);
    this.canvas.requestRender("TransformControls.updateRotating");
  }

  private startScaling(corner: Corner, mouseWorldPos: Point): void {
    if (!this.frame) return;

    this.modeManager.setMode(InteractionMode.SCALING);
    this.selection.beginTransform();

    const { worldCorners } = getPointsOfRectangleSquare(
      this.canvas,
      this.frame,
      false,
    );
    const pivot = worldCorners[diagonalPivotMap[corner]];

    const worldMatrix = this.frame.matrix.getWorldMatrix();
    const localMatrix = this.frame.matrix.getLocalMatrix();
    const inverseWorldMatrix = m3.inverse(worldMatrix);

    const pivotLocal = m3.transformPoint(inverseWorldMatrix, pivot.x, pivot.y);
    const startMouseLocal = m3.transformPoint(
      inverseWorldMatrix,
      mouseWorldPos.x,
      mouseWorldPos.y,
    );

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
    if (!this.scaleState || !this.frame) return;

    const { pivotLocal, localMatrix, inverseWorldMatrix, startDistX, startDistY, corner } = this.scaleState;

    const currentLocal = m3.transformPoint(inverseWorldMatrix, mouseWorldPos.x, mouseWorldPos.y);

    const currentDistX = currentLocal.x - pivotLocal.x;
    const currentDistY = currentLocal.y - pivotLocal.y;

    const doesEffectY = ["tl", "tr", "bl", "br", "mt", "mb"].includes(corner);
    const doesEffectX = ["tl", "tr", "bl", "br", "ml", "mr"].includes(corner);

    let scaleX = startDistX === 0 ? 1 : currentDistX / startDistX;
    let scaleY = startDistY === 0 ? 1 : currentDistY / startDistY;

    if (!doesEffectY) {
      scaleY = 1;
    }

    if (!doesEffectX) {
      scaleX = 1;
    }

    if (event.shiftKey) {
      let uniform = scaleY;

      if (doesEffectX && doesEffectY) {
        uniform = Math.abs(scaleX) > Math.abs(scaleY) ? scaleX : scaleY;
      } else if (doesEffectX) {
        uniform = scaleX;
      }

      scaleX = uniform;
      scaleY = uniform;
    }

    const newMatrix = m3.multiply(
      localMatrix,
      m3.translate(pivotLocal.x, pivotLocal.y),
      m3.scale(scaleX, scaleY),
      m3.translate(-pivotLocal.x, -pivotLocal.y),
    );

    this.frame.matrix.setLocalMatrix(newMatrix);
    this.frame.matrix.setWorldMatrix();
    this.selection.applyTransform();

    this.modified(this.frame);
    this.canvas.requestRender("TransformControls.updateScaling");
  }

  private startDragging(state: DragState): void {
    const target = this.dragTarget(state.entity);

    if (!target) {
      this.dragState = null;
      return;
    }

    state.entity = target;
    state.startMatrix = target.matrix.getWorldMatrix();
    this.modeManager.setMode(InteractionMode.DRAGGING);
    if (target === this.frame) this.selection.beginTransform();
  }

  private updateDragging(worldPos: Point): void {
    const state = this.dragState;
    if (!state?.startMatrix) return;

    const { entity, startWorld, startMatrix } = state;
    setWorldTransform(
      entity,
      m3.multiply(
        m3.translate(worldPos.x - startWorld.x, worldPos.y - startWorld.y),
        startMatrix,
      ),
    );
    if (entity === this.frame) this.selection.applyTransform();

    this.modified(entity);
    this.canvas.requestRender("TransformControls.updateDragging");
  }

  handleAt(screenPos: Point): Corner | null {
    if (!this.frame) return null;

    const { screenCorners } = getPointsOfRectangleSquare(this.canvas, this.frame, true);
    const corners = Object.entries(screenCorners).filter(([key]) => key !== "center") as [Corner, Point][];

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
    this.setCursor(corner ? CURSOR_MAP[corner] : "default");
  }

  private setCursor(cursor: string): void {
    if (this.canvas.element) {
      this.canvas.element.style.cursor = cursor;
    }
  }

  public destroy(): void {
    this.unsubscribers.forEach((unsubscribe) => unsubscribe());
    this.unsubscribers = [];
  }
}
