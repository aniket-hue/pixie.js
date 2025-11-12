import type { Camera } from './Camera.class';
import type { Canvas } from './Canvas.class';
import type { World } from './ecs/World.class';
import { m3 } from './math';
import type { SelectionManager } from './selection/SelectionManager.class';

export class OverlayRenderer {
  private topCanvas: HTMLCanvasElement;
  private topCtx: CanvasRenderingContext2D;
  private selectionManager: SelectionManager;
  private camera: Camera;
  private canvas: Canvas;

  constructor(context: Canvas, topCanvas: HTMLCanvasElement) {
    this.canvas = context;
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

  private drawSelectionBox(selectionMatrix: number[]) {
    const ctx = this.topCtx;

    // Define the four corners of the selection box in local space (-0.5 to 0.5)
    const corners = [
      { x: -0.5, y: -0.5 }, // top-left
      { x: 0.5, y: -0.5 }, // top-right
      { x: 0.5, y: 0.5 }, // bottom-right
      { x: -0.5, y: 0.5 }, // bottom-left
    ];

    // Transform corners from local space to world space using selection matrix
    const worldCorners = corners.map((corner) => m3.transformPoint(selectionMatrix, corner.x, corner.y));

    // Transform world corners to screen coordinates using camera viewport transform
    const screenCorners = worldCorners.map((corner) => {
      const screen = m3.transformPoint(this.camera.viewportTransformMatrix, corner.x, corner.y);
      // Convert to canvas coordinates (flip Y axis)
      return {
        x: screen.x,
        y: this.canvas.height - screen.y,
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
