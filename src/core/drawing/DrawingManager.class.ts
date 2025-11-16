import type { Canvas } from '../Canvas.class';
import { assert } from '../lib/assert';
import { InteractionMode } from '../mode/InteractionModeManager.class';
import { RectangleDrawing } from './impl/RectangleDrawing.class';
import type { DrawingOptions, DrawingStrategy } from './types';

export class DrawingManager {
  private canvas: Canvas;
  private strategy: DrawingStrategy | null = null;
  private topCanvas: HTMLCanvasElement;

  options: DrawingOptions = {
    fillColor: 'rgba(145, 0, 0, 1)',
  };

  constructor(canvas: Canvas) {
    this.canvas = canvas;

    assert(canvas.topCanvas !== null, 'Top canvas not initialized');

    this.topCanvas = canvas.topCanvas;

    this.enableDrawing();
    this.setStrategy(new RectangleDrawing(this.canvas, this.options));
  }

  setOptions(options: Partial<DrawingOptions>): void {
    Object.assign(this.options, options);
  }

  enableDrawing(): void {
    this.canvas.modeManager.setMode(InteractionMode.DRAWING);
  }

  disableDrawing(): void {
    this.canvas.modeManager.setMode(InteractionMode.IDLE);
  }

  isDrawing(): boolean {
    return this.canvas.modeManager.isDrawing();
  }

  setStrategy(strategy: DrawingStrategy): void {
    this.strategy = strategy;
  }

  render(): void {
    if (!this.isDrawing()) {
      return;
    }

    const ctx = this.topCanvas.getContext('2d');

    assert(ctx !== null, 'Failed to get 2D context from top canvas');

    assert(this.strategy !== null, 'Strategy not set');

    this.strategy.render(ctx);
  }
}
