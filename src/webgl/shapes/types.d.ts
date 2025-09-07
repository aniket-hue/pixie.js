export interface IPoint {
  x: number;
  y: number;
}

export interface IShapeDrawParams {
  program: WebGLProgram;
}

export interface IShapeConstructorData {
  canvas: Canvas;
}

export interface IRectangleConstructorData extends IShapeConstructorData {
  x: number;
  y: number;
  width: number;
  height: number;
  color: [number, number, number, number];
  angle?: number;
  scaleX?: number;
  scaleY?: number;
}

export interface ICircleConstructorData extends IShapeConstructorData {
  x: number;
  y: number;
  color: [number, number, number, number];
  radius: number;
  angle?: number;
}

export interface IShape {
  type: 'rectangle' | 'circle';
  viewportTransformMatrix: number[];
  draw(gl: WebGLRenderingContext, data: IShapeDrawParams): void;
  isVisible(): boolean;
  setCenter(x: number, y: number): void;
  getBoundsOnScreen(): {
    tl: IPoint;
    tr: IPoint;
    bl: IPoint;
    br: IPoint;
  };
}
