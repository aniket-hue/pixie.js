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
  angle?: number;
  scaleX?: number;
  scaleY?: number;
  fill?: [number, number, number, number];
  stroke?: [number, number, number, number];
  strokeWidth?: number;
  canvas: Canvas;
}

export interface ICircleConstructorData extends IShapeConstructorData {
  x: number;
  y: number;
  fill: [number, number, number, number];
  radius: number;
  angle?: number;
}
