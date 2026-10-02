import type { Point } from '../../types';
import type { Canvas } from '../Canvas.class';
import type { Entity } from '../ecs/base/Entity.class';
import { m3 } from '../lib/math';

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

const ROTATE_HANDLE_SCREEN_OFFSET = 30;

export function getPointsOfRectangleSquare<T extends boolean>(canvas: Canvas, entity: Entity, withScreen: T = false as T): ReturnType<T> {
  const worldMatrix = entity.matrix.getWorldMatrix();
  const width = entity.size.width;
  const height = entity.size.height;

  const worldScaleY = Math.hypot(worldMatrix[3], worldMatrix[4]) || 1;
  const rotateOffset = ROTATE_HANDLE_SCREEN_OFFSET / (canvas.zoom * worldScaleY);

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
    rotate: { x: 0, y: height / 2 + rotateOffset },

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

// Side handles crowd the corners on a small box, so they hide below this on-screen length.
const MIN_SIDE_FOR_MID_HANDLES = 40;

// Hit-test order too: corners win over the rotate and side handles.
export function handlePoints(canvas: Canvas, frame: Entity): [Corner, Point][] {
  const { screenCorners: c } = getPointsOfRectangleSquare(canvas, frame, true);
  const width = Math.hypot(c.tr.x - c.tl.x, c.tr.y - c.tl.y);
  const height = Math.hypot(c.bl.x - c.tl.x, c.bl.y - c.tl.y);

  const handles: Corner[] = ['tl', 'tr', 'br', 'bl', 'rotate'];
  if (width >= MIN_SIDE_FOR_MID_HANDLES) handles.push('mt', 'mb');
  if (height >= MIN_SIDE_FOR_MID_HANDLES) handles.push('ml', 'mr');

  return handles.map((handle) => [handle, c[handle]]);
}
