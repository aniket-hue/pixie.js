import type { Object } from '../entities/Object.class';
import { m3 } from '../math';

export function createBoundingBoxOfchildren(children: Object[]) {
  if (!children.length) {
    return {
      localMatrix: m3.identity(),
      width: 0,
      height: 0,
    };
  }

  const groupBounds = {
    minX: Infinity,
    minY: Infinity,
    maxX: -Infinity,
    maxY: -Infinity,
  };

  children.forEach((object) => {
    groupBounds.minX = Math.min(groupBounds.minX, object.bounds.minX);
    groupBounds.minY = Math.min(groupBounds.minY, object.bounds.minY);
    groupBounds.maxX = Math.max(groupBounds.maxX, object.bounds.maxX);
    groupBounds.maxY = Math.max(groupBounds.maxY, object.bounds.maxY);
  });

  const gcx = (groupBounds.minX + groupBounds.maxX) / 2;
  const gcy = (groupBounds.minY + groupBounds.maxY) / 2;

  const width = groupBounds.maxX - groupBounds.minX;
  const height = groupBounds.maxY - groupBounds.minY;

  const localMatrix = m3.compose({ tx: gcx, ty: gcy, sx: 1, sy: 1, r: 0 });

  return {
    localMatrix,
    width,
    height,
    bounds: groupBounds,
  };
}
