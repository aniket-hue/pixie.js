export type RectangleProps = {
  x: number;
  y: number;
  width: number;
  height: number;
  fill?: number;
  stroke?: number;
  strokeWidth?: number;
  scaleX?: number;
  scaleY?: number;
  angle?: number;
  visible?: boolean;
  draggable?: boolean;
  selectable?: boolean;
};

export type ImageProps = {
  x: number;
  y: number;
  width?: number;
  height?: number;
  url: string;
  fill?: number;
  stroke?: number;
  strokeWidth?: number;
  scaleX?: number;
  scaleY?: number;
  angle?: number;
  visible?: boolean;
  draggable?: boolean;
  selectable?: boolean;
};
