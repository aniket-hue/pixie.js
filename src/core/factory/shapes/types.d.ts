export interface IRectangleConstructorData {
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
}

export interface ICircleConstructorData {
  x: number;
  y: number;
  fill: [number, number, number, number];
  radius: number;
  angle?: number;
}
