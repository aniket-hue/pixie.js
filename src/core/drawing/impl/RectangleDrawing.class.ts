import { convertHelper } from '../../app/colors';
import type { Canvas } from '../../Canvas.class';
import { Events } from '../../events';
import { createRectangle } from '../../factory';
import { assert } from '../../lib/assert';
import { InteractionMode } from '../../mode/InteractionModeManager.class';
import type { DrawingOptions, DrawingState, DrawingStrategy } from '../types';

export class RectangleDrawing implements DrawingStrategy {
  private canvas: Canvas;
  private drawingOptions: DrawingOptions;

  private drawingState: DrawingState = {
    startPoint: null,
    endPoint: null,
  };

  constructor(canvas: Canvas, drawingOptions: DrawingOptions) {
    this.canvas = canvas;
    this.drawingOptions = drawingOptions;

    this.initListeners();

    this.enableDrawing();
  }

  enableDrawing(): void {
    this.canvas.modeManager.setMode(InteractionMode.DRAWING);
  }

  disableDrawing(): void {
    this.canvas.modeManager.setMode(InteractionMode.IDLE);
  }

  private initListeners(): void {
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);

    this.canvas.on(Events.MOUSE_DOWN, this.onMouseDown.bind(this));
    this.canvas.on(Events.MOUSE_UP, this.onMouseUp.bind(this));
    this.canvas.on(Events.MOUSE_MOVE, this.onMouseMove.bind(this));
  }

  private onMouseDown(event: MouseEvent): void {
    if (!this.canvas.modeManager.isDrawing()) {
      return;
    }

    this.drawingState.startPoint = {
      x: event.offsetX,
      y: event.offsetY,
    };
  }

  private onMouseMove(event: MouseEvent): void {
    if (!this.canvas.modeManager.isDrawing()) {
      return;
    }

    const currentPoint = {
      x: event.offsetX,
      y: event.offsetY,
    };

    this.drawingState.endPoint = currentPoint;
    this.canvas.requestRender();
  }

  private onMouseUp(): void {
    if (!this.canvas.modeManager.isDrawing()) {
      return;
    }

    const { startPoint, endPoint } = this.drawingState;

    assert(startPoint !== null && endPoint !== null, 'Start and end point must be set');

    const center = {
      x: (startPoint.x + endPoint.x) / 2,
      y: (startPoint.y + endPoint.y) / 2,
    };

    const worldCenter = this.canvas.camera.screenToWorld(center.x, center.y);
    const width = Math.abs(endPoint.x - startPoint.x);
    const height = Math.abs(endPoint.y - startPoint.y);

    const hexFillColor = convertHelper(this.drawingOptions.fillColor);

    const rectFactory = createRectangle({
      x: worldCenter.x,
      y: worldCenter.y,
      width,
      height,
      fill: hexFillColor,
      selectable: false,
      draggable: false,
    });

    this.canvas.world.addEntityFactory(rectFactory);

    this.drawingState = {
      startPoint: null,
      endPoint: null,
    };

    this.canvas.requestRender();

    this.disableDrawing();
  }

  render(ctx: CanvasRenderingContext2D): void {
    const { startPoint, endPoint } = this.drawingState;

    if (!startPoint || !endPoint) {
      return;
    }

    ctx.save();
    // ctx.clearRect(0, 0, this.topCanvas.width, this.topCanvas.height);
    const width = Math.abs(endPoint.x - startPoint.x);
    const height = Math.abs(endPoint.y - startPoint.y);

    const x = startPoint.x < endPoint.x ? startPoint.x : endPoint.x;
    const y = startPoint.y < endPoint.y ? startPoint.y : endPoint.y;

    ctx.fillStyle = this.drawingOptions.fillColor;
    ctx.fillRect(x, y, width, height);
    ctx.restore();
  }
}
