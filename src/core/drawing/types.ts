import type { Point } from '../../types';
import type { DrawingManager } from './DrawingManager.class';

export interface DrawingState {
  startPoint: Point | null;
  endPoint: Point | null;
}

export interface DrawingStrategy {
  drawingManager: DrawingManager;
  render(ctx: CanvasRenderingContext2D): void;
}

export interface DrawingOptions {
  fillColor: string;
  onComplete?: () => void;
  onCancel?: () => void;
}
