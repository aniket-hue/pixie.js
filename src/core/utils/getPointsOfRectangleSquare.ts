import type { Point } from '../../types';
import type { Canvas } from '../Canvas.class';
import { getHeight, getWidth, getWorldMatrix } from '../ecs/components';
import { m3 } from '../math';

type ReturnType<T extends boolean> = T extends true
  ? {
      worldCorners: Record<Corner, Point>;
      screenCorners: Record<Corner, Point>;
    }
  : {
      worldCorners: Record<Corner, Point>;
    };

export type Corner = 'tl' | 'tr' | 'br' | 'bl' | 'mt' | 'ml' | 'mb' | 'mr' | 'rotate' | 'center';

// export const pivotMap: Record<Corner, number> = { tl: 0, tr: 1, br: 2, bl: 3, mt: 4, ml: 5, mb: 6, mr: 7 };
export const diagonalPivotMap: Record<Corner, Corner> = {
  tl: 'br',
  tr: 'bl',
  br: 'tl',
  bl: 'tr',
  mt: 'mb',
  ml: 'mr',
  mb: 'mt',
  mr: 'ml',

  rotate: 'center',

  center: 'center',
};

export function getPointsOfRectangleSquare<T extends boolean>(canvas: Canvas, eid: number, withScreen: T = false as T): ReturnType<T> {
  const worldMatrix = getWorldMatrix(eid);
  const width = getWidth(eid);
  const height = getHeight(eid);

  const localCorners = {
    tl: { x: -width / 2, y: height / 2 },
    tr: { x: width / 2, y: height / 2 },
    br: { x: width / 2, y: -height / 2 },
    bl: { x: -width / 2, y: -height / 2 },

    // Middle
    mt: { x: 0, y: height / 2 }, // top
    ml: { x: -width / 2, y: 0 }, // left
    mb: { x: 0, y: -height / 2 }, // bottom
    mr: { x: width / 2, y: 0 }, // right

    // Rotate
    rotate: { x: 0, y: height / 2 + 30 },

    center: { x: 0, y: 0 },
  };

  const worldCorners = Object.entries(localCorners).reduce(
    (acc, [corner, point]) => {
      acc[corner as Corner] = m3.transformPoint(worldMatrix, point.x, point.y);
      return acc;
    },
    {} as Record<Corner, Point>,
  );

  if (withScreen === true) {
    const screenCorners = Object.entries(worldCorners).reduce(
      (acc, [corner, point]) => {
        acc[corner as Corner] = canvas.camera.worldToScreen(point.x, point.y);

        return acc;
      },
      {} as Record<Corner, Point>,
    );

    return { worldCorners, screenCorners } as ReturnType<T>;
  }

  return { worldCorners } as ReturnType<T>;
}
