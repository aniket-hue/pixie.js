import type { Canvas } from '../Canvas.class';
import { uuidv4 } from '../utils/uuid';
import type { IPoint, IShapeDrawParams } from './types';

export class Shape {
  id: string;
  viewportTransformMatrix: number[];
  canvas: Canvas | null;
  type: 'rectangle' | 'circle';

  constructor() {
    this.id = uuidv4();
    this.viewportTransformMatrix = [1, 0, 0, 0, 1, 0, 0, 0, 1];
    this.type = 'rectangle';
    this.canvas = null;
  }

  draw(_gl: WebGLRenderingContext, _data: IShapeDrawParams): void {
    throw new Error('Method not implemented.');
  }

  setCenter(x: number, y: number): void {
    throw new Error('Method not implemented.');
  }

  containsPoint(x: number, y: number): boolean {
    throw new Error('Method not implemented.');
  }

  getBoundsOnScreen(): {
    tl: IPoint;
    tr: IPoint;
    bl: IPoint;
    br: IPoint;
  } {
    throw new Error('Method not implemented.');
  }

  isVisible(): boolean {
    const canvas = this.canvas;

    if (canvas === null) {
      return true;
    }

    const bounds = this.getBoundsOnScreen();
    const isInXBounds = (x: number) => x > 0 && x < canvas.width;
    const isInYBounds = (y: number) => y > 0 && y < canvas.height;
    const isInBounds = (x: number, y: number) => isInXBounds(x) && isInYBounds(y);

    return (
      isInBounds(bounds.tl.x, bounds.tl.y) ||
      isInBounds(bounds.tr.x, bounds.tr.y) ||
      isInBounds(bounds.bl.x, bounds.bl.y) ||
      isInBounds(bounds.br.x, bounds.br.y)
    );
  }
}
