import type { Point } from '../types';
import type { Canvas } from './Canvas.class';
import type { Entity } from './ecs/base/Entity.class';
import type { World } from './ecs/World.class';
import { assert } from './lib/assert';
import type { SelectionManager } from './selection/SelectionManager.class';
import { type Corner, getPointsOfRectangleSquare, handlePoints } from './utils/getPointsOfRectangleSquare';

// One colour for every selection mark, bright enough to read on dark and light content.
const ACCENT = '#3b82f6';

export class OverlayRenderer {
  private topCanvas: HTMLCanvasElement;
  private topCtx: CanvasRenderingContext2D;
  private selectionManager: SelectionManager;
  private canvas: Canvas;

  constructor(context: Canvas) {
    assert(context.topCanvas !== null, 'Top canvas not initialized');

    this.canvas = context;
    this.topCanvas = context.topCanvas;

    const ctx = this.topCanvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context from top canvas');
    }
    this.topCtx = ctx;
    this.selectionManager = context.selectionManager;
  }

  private clear() {
    const dpr = this.canvas.dpr;

    this.topCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.topCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);
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

    const fillColor = 'rgba(142, 193, 244, 0.11)';
    const strokeColor = ACCENT;

    ctx.fillStyle = fillColor;
    ctx.beginPath();
    ctx.moveTo(screenCorners[0].x, screenCorners[0].y);
    ctx.lineTo(screenCorners[1].x, screenCorners[1].y);
    ctx.lineTo(screenCorners[2].x, screenCorners[2].y);
    ctx.lineTo(screenCorners[3].x, screenCorners[3].y);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(screenCorners[0].x, screenCorners[0].y);
    ctx.lineTo(screenCorners[1].x, screenCorners[1].y);
    ctx.lineTo(screenCorners[2].x, screenCorners[2].y);
    ctx.lineTo(screenCorners[3].x, screenCorners[3].y);
    ctx.closePath();
    ctx.stroke();
  }

  private drawControls(handles: [Corner, Point][]) {
    const ctx = this.topCtx;

    // Blue
    const strokeColor = ACCENT;
    const fillColor = 'rgba(255, 255, 255, 1)';

    function drawControl(point: Point) {
      ctx.save();
      ctx.fillStyle = fillColor;
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(point.x, point.y, 5, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    handles.forEach(([, point]) => drawControl(point));
  }

  private drawSelectionGroup(activeGroup: Entity) {
    const ctx = this.topCtx;
    const { screenCorners: bounds } = getPointsOfRectangleSquare(this.canvas, activeGroup, true);

    const strokeColor = ACCENT;
    const strokeWidth = 2;

    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.beginPath();
    ctx.moveTo(bounds.tl.x, bounds.tl.y);
    ctx.lineTo(bounds.tr.x, bounds.tr.y);
    ctx.lineTo(bounds.br.x, bounds.br.y);
    ctx.lineTo(bounds.bl.x, bounds.bl.y);
    ctx.closePath();
    ctx.stroke();

    // Handles are noise while moving; during a resize they show which one is held.
    if (!this.canvas.modeManager.isDragging()) {
      // Ties the rotate handle to the box, so it doesn't read as one more resize handle.
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(bounds.mt.x, bounds.mt.y);
      ctx.lineTo(bounds.rotate.x, bounds.rotate.y);
      ctx.stroke();

      this.drawControls(handlePoints(this.canvas, activeGroup));
    }
  }

  private drawOutlines(entities: Entity[], lineWidth = 1) {
    const ctx = this.topCtx;

    ctx.strokeStyle = ACCENT;
    ctx.lineWidth = lineWidth;

    for (const entity of entities) {
      const { screenCorners: c } = getPointsOfRectangleSquare(this.canvas, entity, true);

      ctx.beginPath();
      ctx.moveTo(c.tl.x, c.tl.y);
      ctx.lineTo(c.tr.x, c.tr.y);
      ctx.lineTo(c.br.x, c.br.y);
      ctx.lineTo(c.bl.x, c.bl.y);
      ctx.closePath();
      ctx.stroke();
    }
  }

  render(_world: World) {
    this.clear();

    const activeSelectionBox = this.selectionManager.selectionBox;
    const activeGroup = this.selectionManager.frame;
    const hovered = this.selectionManager.hovered;

    if (hovered?.world && !this.selectionManager.isSelected(hovered)) {
      this.drawOutlines([hovered], 2);
    }

    if (activeSelectionBox !== null) {
      this.drawOutlines(this.selectionManager.preview);
      this.drawSelectionBox(activeSelectionBox);
    }

    if (activeGroup !== null) {
      const members = this.selectionManager.selected;
      if (members.length > 1) this.drawOutlines(members);

      this.drawSelectionGroup(activeGroup);
    }
  }
}
