import type { Entity } from '../ecs/Entity.class';
import { m3 } from '../math';
import { computeBoundsOfMatrix } from './computeBoundsOfMatrix';

function getBounds({ worldMatrix, size }: { worldMatrix: number[]; size: { width: number; height: number } }) {
  if (!worldMatrix || !size) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }

  const m = worldMatrix;
  const w = 'width' in size ? (size.width ?? 0) : 0;
  const h = 'height' in size ? (size.height ?? 0) : 0;

  return computeBoundsOfMatrix({
    matrix: m,
    size: {
      width: w,
      height: h,
    },
  });
}

export function createBoundingBoxOfchildren(children: Entity[]) {
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

  children.forEach((child) => {
    const worldMatrix = child.matrix.getWorldMatrix();
    const width = child.size.width;
    const height = child.size.height;

    const bounds = getBounds({
      worldMatrix,
      size: {
        width,
        height,
      },
    });

    groupBounds.minX = Math.min(groupBounds.minX, bounds.minX);
    groupBounds.minY = Math.min(groupBounds.minY, bounds.minY);
    groupBounds.maxX = Math.max(groupBounds.maxX, bounds.maxX);
    groupBounds.maxY = Math.max(groupBounds.maxY, bounds.maxY);
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
