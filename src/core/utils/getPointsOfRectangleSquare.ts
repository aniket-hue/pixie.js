import type { Point } from '../../types';
import type { Canvas } from '../Canvas.class';
import { getHeight, getWidth, getWorldMatrix } from '../ecs/components';
import { m3 } from '../math';

type ReturnType<T extends boolean> = T extends true
  ? {
      worldCorners: Point[];
      screenCorners: Point[];
    }
  : {
      worldCorners: Point[];
    };

export function getPointsOfRectangleSquare<T extends boolean>(canvas: Canvas, eid: number, withScreen: T = false as T): ReturnType<T> {
  const worldMatrix = getWorldMatrix(eid);
  const width = getWidth(eid);
  const height = getHeight(eid);

  const localCorners = [
    { x: -width / 2, y: height / 2 },
    { x: width / 2, y: height / 2 },
    { x: width / 2, y: -height / 2 },
    { x: -width / 2, y: -height / 2 },

    // Middle
    { x: 0, y: height / 2 }, // top
    { x: -width / 2, y: 0 }, // left
    { x: 0, y: -height / 2 }, // bottom
    { x: width / 2, y: 0 }, // right
  ];

  const worldCorners = localCorners.map((corner) => m3.transformPoint(worldMatrix, corner.x, corner.y));

  if (withScreen === true) {
    const screenCorners = worldCorners.map((worldCorner) => canvas.camera.worldToScreen(worldCorner.x, worldCorner.y));

    return { worldCorners, screenCorners } as ReturnType<T>;
  }

  return { worldCorners } as ReturnType<T>;
}
