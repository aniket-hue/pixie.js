import type { Point } from '../../types';
import type { Canvas } from '../Canvas.class';
import type { Entity } from '../ecs/Entity.class';
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

export function getPointsOfRectangleSquare<T extends boolean>(canvas: Canvas, entityOrId: Entity | number, withScreen: T = false as T): ReturnType<T> {
  let entity: Entity;
  
  if (typeof entityOrId === 'number') {
    // Legacy support: look up entity by ID
    const foundEntity = canvas.world.getEntityById(entityOrId);
    if (!foundEntity) {
      throw new Error(`Entity with id ${entityOrId} not found`);
    }
    entity = foundEntity;
  } else {
    entity = entityOrId;
  }

  const worldMatrix = entity.matrix.getWorldMatrix();
  const width = entity.size.width;
  const height = entity.size.height;

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
    rotate: { x: 0, y: height / 2 + 30 / canvas.zoom },

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
