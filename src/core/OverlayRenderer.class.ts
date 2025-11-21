import type { Point } from '../types';
import type { Canvas } from './Canvas.class';
import type { Entity } from './ecs/base/Entity.class';
import type { World } from './ecs/World.class';
import { assert } from './lib/assert';
import type { SelectionManager } from './selection/SelectionManager.class';
import { type Corner, getPointsOfRectangleSquare } from './utils/getPointsOfRectangleSquare';

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

    const fillColor = 'rgba(142, 193, 244, 0.11)';
    const strokeColor = '#1c398e';

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

  private drawControls(bounds: Record<Corner, Point>) {
    const ctx = this.topCtx;

    const { center: _, ...rest } = bounds;

    // Blue
    const strokeColor = '#1c398e';
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

    Object.values(rest).forEach(drawControl);
  }

  private drawSelectionGroup(activeGroup: Entity) {
    const ctx = this.topCtx;
    const { screenCorners: bounds } = getPointsOfRectangleSquare(this.canvas, activeGroup, true);

    const strokeColor = '#1c398e';
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
    ctx.setLineDash([]);

    this.drawControls(bounds);
  }

  render(_world: World) {
    this.clear();

    const activeSelectionBox = this.selectionManager.selectionBox;
    const activeGroup = this.selectionManager.activeGroup;

    if (activeSelectionBox !== null) {
      this.drawSelectionBox(activeSelectionBox);
    }

    if (activeGroup !== null) {
      this.drawSelectionGroup(activeGroup);
    }
  }
}
