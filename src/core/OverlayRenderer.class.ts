import type { Point } from '../types';
import type { Camera } from './Camera.class';
import type { Canvas } from './Canvas.class';
import type { World } from './ecs/World.class';
import type { SelectionManager } from './selection/SelectionManager.class';

export class OverlayRenderer {
  private topCanvas: HTMLCanvasElement;
  private topCtx: CanvasRenderingContext2D;
  private selectionManager: SelectionManager;
  private camera: Camera;

  constructor(context: Canvas, topCanvas: HTMLCanvasElement) {
    this.topCanvas = topCanvas;
    const ctx = topCanvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context from top canvas');
    }
    this.topCtx = ctx;
    this.selectionManager = context.selectionManager;
    this.camera = context.camera;
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
      return; // Don't draw if there's no current point
    }

    // Calculate bounding box in world coordinates
    const bounds = this.getSelectionBoxBounds(selectionBox.start, selectionBox.current);
    if (!bounds) {
      return;
    }

    // Calculate the four corners in world space
    const worldCorners = [
      { x: bounds.sx, y: bounds.sy }, // top-left
      { x: bounds.dx, y: bounds.sy }, // top-right
      { x: bounds.dx, y: bounds.dy }, // bottom-right
      { x: bounds.sx, y: bounds.dy }, // bottom-left
    ];

    const screenCorners = worldCorners.map((worldCorner) => {
      return {
        x: worldCorner.x,
        y: worldCorner.y,
      };
    });

    // Draw filled rectangle
    ctx.fillStyle = 'rgba(142, 193, 244, 0.11)';
    ctx.beginPath();
    ctx.moveTo(screenCorners[0].x, screenCorners[0].y);
    ctx.lineTo(screenCorners[1].x, screenCorners[1].y);
    ctx.lineTo(screenCorners[2].x, screenCorners[2].y);
    ctx.lineTo(screenCorners[3].x, screenCorners[3].y);
    ctx.closePath();
    ctx.fill();

    // Draw border
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

  render(_world: World) {
    this.clear();

    if (this.selectionManager.selectionBox !== null) {
      this.drawSelectionBox(this.selectionManager.selectionBox);
    }
  }
}
