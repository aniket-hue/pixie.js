import type { Point } from '../../types';
import type { Corner } from '../utils/getPointsOfRectangleSquare';

export interface DragState {
  entityId: number;
  offset: Point;
  startPos: Point;
}

export interface ScaleState {
  corner: Corner;
  pivotLocal: Point;
  localMatrix: number[];
  inverseWorldMatrix: number[];
  startDistX: number;
  startDistY: number;
}

export interface RotateState {
  centerLocal: Point;
  inverseLocalMatrix: number[];
  startAngle: number;
  decomposedLocal: {
    scaleX: number;
    scaleY: number;
    rotation: number;
    tx: number;
    ty: number;
  };
}
