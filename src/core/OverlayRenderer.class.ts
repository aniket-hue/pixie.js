import type { Point } from '../types';
import { SELECTION_BOX_BORDER_COLOR } from './app/colors';
import type { Canvas } from './Canvas.class';
import type { World } from './ecs/World.class';
import { Events } from './events';
import { assert } from './lib/assert';
import type { SelectionManager } from './selection/SelectionManager.class';
import { getPointsOfRectangleSquare } from './utils/getPointsOfRectangleSquare';

export class OverlayRenderer {
  private topCanvas: HTMLCanvasElement;
  private topCtx: CanvasRenderingContext2D;
  private selectionManager: SelectionManager;
  private canvas: Canvas;
  private hoveredControl: {
    tl: boolean;
    tr: boolean;
    br: boolean;
    bl: boolean;
  } = {
    tl: false,
    tr: false,
    br: false,
    bl: false,
  };

  private activeGroup: number | null = null;
  private activeGroupBounds: { sx: number; dx: number; sy: number; dy: number } | null = null;
  private activeGroupCorners: {
    tl: Point;
    tr: Point;
    br: Point;
    bl: Point;
  } | null = null;

  constructor(context: Canvas) {
    this.canvas = context;

    assert(context.topCanvas !== null, 'Top canvas not initialized');

    this.topCanvas = context.topCanvas;

    const ctx = this.topCanvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context from top canvas');
    }
    this.topCtx = ctx;
    this.selectionManager = context.selectionManager;
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

    // this.canvas.on(Events.MOUSE_MOVE, this.onMouseMove);
    // this.canvas.on(Events.MOUSE_DOWN, this.onMouseDown);
    // this.canvas.on(Events.MOUSE_UP, this.onMouseUp);
  }

  private onSelectionGroupUpdated(event: { id: number }): void {
    const { screenCorners } = getPointsOfRectangleSquare(this.canvas, event.id, true);

    this.activeGroupCorners = {
      tl: screenCorners[0],
      tr: screenCorners[1],
      br: screenCorners[2],
      bl: screenCorners[3],
    };
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

  private onSelectionGroupRemoved(event: { id: number }): void {
    this.activeGroupCorners = null;
    this.activeGroup = null;
  }

  private onMouseMove(event: MouseEvent): void {
    if (this.canvas.getActiveGroup()) {
      return;
    }

    const activeSelectionBox = this.canvas.getActiveGroup();

    if (activeSelectionBox === null) {
      return;
    }

    const { screenCorners } = getPointsOfRectangleSquare(this.canvas, activeSelectionBox, true);
    const tl = screenCorners[0];
    const tr = screenCorners[1];
    const br = screenCorners[2];
    const bl = screenCorners[3];

    const pointerPoint = { x: event.offsetX, y: event.offsetY };

    function isInside(corner: Point) {
      return pointerPoint.x >= corner.x && pointerPoint.x <= corner.x && pointerPoint.y >= corner.y && pointerPoint.y <= corner.y;
    }

    this.hoveredControl.tl = isInside(tl);
    this.hoveredControl.tr = isInside(tr);
    this.hoveredControl.br = isInside(br);
    this.hoveredControl.bl = isInside(bl);
  }

  private onMouseDown(event: MouseEvent): void {
    console.log('mouse down', event);
  }

  private onMouseUp(event: MouseEvent): void {
    console.log('mouse up', event);
  }

  public destroy(): void {
    this.canvas.off(Events.MOUSE_MOVE, this.onMouseMove);
    this.canvas.off(Events.MOUSE_DOWN, this.onMouseDown);
    this.canvas.off(Events.MOUSE_UP, this.onMouseUp);
  }

  private clear() {
    this.topCtx.clearRect(0, 0, this.topCanvas.width, this.topCanvas.height);
  }

  private getSelectionBoxBounds(startPos: Point, currentPos: Point | undefined) {
    if (!startPos || !currentPos) {
      return null;
    }

    const final: { sx: number; dx: number; sy: number; dy: number } = {
      sx: 0,
      dx: 0,
      sy: 0,
      dy: 0,
    };

    if (startPos.x < currentPos.x) {
      final.sx = startPos.x;
      final.dx = currentPos.x;
    } else {
      final.sx = currentPos.x;
      final.dx = startPos.x;
    }

    if (startPos.y < currentPos.y) {
      final.sy = startPos.y;
      final.dy = currentPos.y;
    } else {
      final.sy = currentPos.y;
      final.dy = startPos.y;
    }

    return final;
  }

  private drawSelectionBox(selectionBox: { start: Point; current?: Point }) {
    const ctx = this.topCtx;

    if (!selectionBox.current) {
      return;
    }

    const bounds = this.getSelectionBoxBounds(selectionBox.start, selectionBox.current);

    if (!bounds) {
      return;
    }

    const screenCorners = [
      { x: bounds.sx, y: bounds.sy },
      { x: bounds.dx, y: bounds.sy },
      { x: bounds.dx, y: bounds.dy },
      { x: bounds.sx, y: bounds.dy },
    ];

    ctx.fillStyle = 'rgba(142, 193, 244, 0.11)';
    ctx.beginPath();
    ctx.moveTo(screenCorners[0].x, screenCorners[0].y);
    ctx.lineTo(screenCorners[1].x, screenCorners[1].y);
    ctx.lineTo(screenCorners[2].x, screenCorners[2].y);
    ctx.lineTo(screenCorners[3].x, screenCorners[3].y);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = 'rgba(51, 153, 255, 0.8)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(screenCorners[0].x, screenCorners[0].y);
    ctx.lineTo(screenCorners[1].x, screenCorners[1].y);
    ctx.lineTo(screenCorners[2].x, screenCorners[2].y);
    ctx.lineTo(screenCorners[3].x, screenCorners[3].y);
    ctx.closePath();
    ctx.stroke();
  }

  private drawControls(pointerPoints: Point[]) {
    const ctx = this.topCtx;

    pointerPoints.forEach((pointerPoint) => {
      ctx.save();
      ctx.fillStyle = 'rgba(255, 255, 255, 1)';
      ctx.beginPath();
      ctx.arc(pointerPoint.x, pointerPoint.y, 5, 0, 2 * Math.PI);
      ctx.fill();
      ctx.restore();
    });
  }

  private drawSelectionGroup(groupId: number) {
    const ctx = this.topCtx;

    const { screenCorners } = getPointsOfRectangleSquare(this.canvas, groupId, true);

    const bounds = this.activeGroupCorners;

    assert(bounds !== null, 'Bounds not initialized');

    const strokeColor = SELECTION_BOX_BORDER_COLOR;
    const strokeWidth = 4;

    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.beginPath();
    ctx.moveTo(bounds.tl.x, bounds.tl.y);
    ctx.lineTo(bounds.tr.x, bounds.tr.y);
    ctx.lineTo(bounds.br.x, bounds.br.y);
    ctx.lineTo(bounds.bl.x, bounds.bl.y);
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);

    this.drawControls(screenCorners);
  }

  render(_world: World) {
    this.clear();

    const activeSelectionBox = this.selectionManager.selectionBox;
    const activeGroup = this.canvas.getActiveGroup();

    if (activeSelectionBox !== null) {
      assert(Boolean(activeGroup) === false, 'Selection box initialized');

      this.drawSelectionBox(activeSelectionBox);
    }

    if (activeGroup !== null) {
      this.drawSelectionGroup(activeGroup);
    }
  }
}
