import type { BoundingBox, Point } from '../../types';
import type { Canvas } from '../Canvas.class';
import { getWorldMatrix } from '../ecs/components';
import { getHeight, getWidth } from '../ecs/components/size';
import { m3 } from '../math';

interface PickOptionsBoundingBox {
  boundingBox: BoundingBox;
  filter?: (eid: number) => boolean;
}

interface PickOptionsPoint {
  point: Point;
  filter?: (eid: number) => boolean;
}

export class Picking {
  private canvas: Canvas;

  constructor(canvas: Canvas) {
    this.canvas = canvas;
  }

  containsPoint(eid: number, worldX: number, worldY: number) {
    const worldMatrix = getWorldMatrix(eid);
    const inMatrix = m3.inverse(worldMatrix);
    const localPoint = m3.transformPoint(inMatrix, worldX, worldY);

    const w = getWidth(eid);
    const h = getHeight(eid);

    const halfWidth = w * 0.5;
    const halfHeight = h * 0.5;

    return localPoint.x >= -halfWidth && localPoint.x <= halfWidth && localPoint.y >= -halfHeight && localPoint.y <= halfHeight;
  }

  private findEntitiesInBoundingBox(boundingBox: BoundingBox, filter?: (eid: number) => boolean): number[] {
    const allIntersecting = [];
    const tree = this.canvas.world.tree;

    const intersecting = tree
      .search(boundingBox)
      .map((item) => item.id)
      .filter((item) => (filter ? filter(item) : true));

    allIntersecting.push(...intersecting);

    return allIntersecting;
  }

  pick(options: PickOptionsPoint | PickOptionsBoundingBox): number[] | null {
    if ('point' in options) {
      const array = Array.from(this.canvas.world.getEntities());

      for (let i = array.length - 1; i >= 0; i--) {
        const eid = array[i];

        if (this.containsPoint(eid, options.point.x, options.point.y)) {
          return [eid];
        }
      }

      return null;
    }

    if ('boundingBox' in options) {
      return this.findEntitiesInBoundingBox(options.boundingBox, options.filter);
    }

    return null;
  }
}
