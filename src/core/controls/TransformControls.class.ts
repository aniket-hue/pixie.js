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
import {
  type Corner,
  diagonalPivotMap,
  getPointsOfRectangleSquare,
  handlePoints,
} from "../utils/getPointsOfRectangleSquare";
import { containsPoint, setWorldTransform } from "../utils/shapes";
import type { DragState, RotateState, ScaleState } from "./types";

const CONSTANTS = {
  DRAG_THRESHOLD: 2,
  HANDLE_REACH: 10,
  // A fingertip covers far more than a cursor tip.
  HANDLE_REACH_TOUCH: 20,
  ROTATION_SNAP: Math.PI / 12,
} as const;

// Each handle's direction in the box's own axes: x right, y up.
const HANDLE_DIRECTION: Record<
  Exclude<Corner, "rotate" | "center">,
  [number, number]
> = {
  tl: [-1, 1],
  tr: [1, 1],
  br: [1, -1],
  bl: [-1, -1],
  mt: [0, 1],
  mb: [0, -1],
  ml: [-1, 0],
  mr: [1, 0],
};

// Indexed by on-screen angle in 45 degree steps, starting at pointing right.
const RESIZE_CURSORS = ["ew-resize", "nwse-resize", "ns-resize", "nesw-resize"];

const unit = (x: number, y: number) => {
  const length = Math.hypot(x, y) || 1;
  return { x: x / length, y: y / length };
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
    this.listen(Events.KEY_DOWN, this.handleKeyDown.bind(this));
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

  private handleMouseDown(event: PointerEvent): void {
    if (this.modeManager.isDrawing()) return;

    const screenPos = { x: event.offsetX, y: event.offsetY };
    const worldPos = this.canvas.camera.screenToWorld(
      event.offsetX,
      event.offsetY,
    );
    const corner = this.handleAt(screenPos, event.pointerType);

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

  private updateRotating(event: MouseEvent, mouseWorldPos: Point): void {
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
    let newRotation = decomposedLocal.rotation + deltaAngle;

    if (event.shiftKey) {
      newRotation =
        Math.round(newRotation / CONSTANTS.ROTATION_SNAP) *
        CONSTANTS.ROTATION_SNAP;
    }

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

    this.scaleState = {
      corner,
      pivotLocal,
      localMatrix,
      inverseWorldMatrix,
      startMouseLocal,
    };
  }

  private updateScaling(event: MouseEvent, mouseWorldPos: Point): void {
    if (!this.scaleState || !this.frame) return;

    const { localMatrix, inverseWorldMatrix, startMouseLocal, corner } =
      this.scaleState;
    // Alt scales from the centre, the box's local origin, instead of the opposite handle.
    const pivotLocal = event.altKey
      ? { x: 0, y: 0 }
      : this.scaleState.pivotLocal;

    const currentLocal = m3.transformPoint(
      inverseWorldMatrix,
      mouseWorldPos.x,
      mouseWorldPos.y,
    );
    const startDistX = startMouseLocal.x - pivotLocal.x;
    const startDistY = startMouseLocal.y - pivotLocal.y;

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

  handleAt(screenPos: Point, pointerType = "mouse"): Corner | null {
    if (!this.frame) return null;

    let reach: number = CONSTANTS.HANDLE_REACH;
    if (pointerType === "touch") reach = CONSTANTS.HANDLE_REACH_TOUCH;

    for (const [handle, point] of handlePoints(this.canvas, this.frame)) {
      if (
        Math.abs(screenPos.x - point.x) <= reach &&
        Math.abs(screenPos.y - point.y) <= reach
      ) {
        return handle;
      }
    }

    return null;
  }

  // Follows the handle's on-screen direction, so rotated and flipped boxes still show the right arrows.
  private cursorFor(handle: Corner): string {
    if (handle === "rotate" || handle === "center" || !this.frame)
      return "grab";

    const { screenCorners: c } = getPointsOfRectangleSquare(
      this.canvas,
      this.frame,
      true,
    );
    const right = unit(c.mr.x - c.center.x, c.mr.y - c.center.y);
    const up = unit(c.mt.x - c.center.x, c.mt.y - c.center.y);
    const [sx, sy] = HANDLE_DIRECTION[handle];

    const angle = Math.atan2(
      sx * right.y + sy * up.y,
      sx * right.x + sy * up.x,
    );
    const step = Math.round(angle / (Math.PI / 4));

    return RESIZE_CURSORS[((step % 4) + 4) % 4];
  }

  private updateCursorForCorner(corner: Corner | null): void {
    this.setCursor(corner ? this.cursorFor(corner) : "default");
  }

  private handleKeyDown(event: KeyboardEvent): void {
    const transforming =
      this.modeManager.isDragging() ||
      this.modeManager.isScaling() ||
      this.modeManager.isRotating();
    if (event.key !== "Escape" || !transforming) return;

    // Esc mid-gesture puts everything back and keeps the selection.
    event.preventDefault();

    const drag = this.dragState;
    if (drag?.startMatrix && drag.entity !== this.frame) {
      setWorldTransform(drag.entity, drag.startMatrix);
      this.canvas.fire(Events.OBJECT_MODIFIED, [drag.entity]);
    } else {
      this.selection.cancelTransform();
      this.canvas.fire(Events.OBJECT_MODIFIED, this.selection.selected);
    }

    this.modeManager.reset();
    this.dragState = null;
    this.scaleState = null;
    this.rotateState = null;
    this.canvas.requestRender("TransformControls.cancel");
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
