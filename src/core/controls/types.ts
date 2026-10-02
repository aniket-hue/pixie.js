import type { Point } from '../../types';
import type { Entity } from '../ecs/base/Entity.class';
import type { Corner } from '../utils/getPointsOfRectangleSquare';

export interface DragState {
  entity: Entity;
  startPos: Point;
  startWorld: Point;
  startMatrix: number[] | null;
}

export interface ScaleState {
  corner: Corner;
  pivotLocal: Point;
  localMatrix: number[];
  inverseWorldMatrix: number[];
  startMouseLocal: Point;
}

export interface RotateState {
  centerLocal: Point;
  inverseWorldMatrix: number[];
  startAngle: number;
  decomposedLocal: {
    scaleX: number;
    scaleY: number;
    rotation: number;
    tx: number;
    ty: number;
  };
}
