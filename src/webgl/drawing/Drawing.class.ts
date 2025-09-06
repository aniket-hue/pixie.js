import type { Canvas } from '../Canvas.class';

export class Drawing {
  canvas: Canvas;
  mode: 'rectangle' | 'circle';

  constructor(canvas: Canvas) {
    this.canvas = canvas;
    this.mode = 'rectangle';
  }

  setMode(mode: 'rectangle' | 'circle') {
    this.mode = mode;
  }

  drawRectangle(x: number, y: number, width: number, height: number) {}
}
