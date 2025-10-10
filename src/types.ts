export interface Point {
  x: number;
  y: number;
}

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface Camera {
  x: number;
  y: number;
  zoom: number;
}

export interface ViewportTransform {
  scale: number;
  translateX: number;
  translateY: number;
}

export interface CanvasState {
  isDragging: boolean;
  lastPointerPosition: Point | null;
  camera: Camera;
}
