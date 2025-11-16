import type { Point } from '../../types';

export interface DrawingState {
  startPoint: Point | null;
  endPoint: Point | null;
}

export interface DrawingStrategy {
  render(ctx: CanvasRenderingContext2D): void;
}

export interface DrawingOptions {
  fillColor: string;
}
