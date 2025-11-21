import type { BoundingBox, Point } from '../../types';
import type { Canvas } from '../Canvas.class';
import type { Entity } from '../ecs/Entity.class';
import { m3 } from '../math';

interface PickOptionsBoundingBox {
  boundingBox: BoundingBox;
  filter?: (entity: Entity) => boolean;
}

interface PickOptionsPoint {
  point: Point;
  filter?: (entity: Entity) => boolean;
}

export class Picking {
  private canvas: Canvas;

  constructor(canvas: Canvas) {
    this.canvas = canvas;
  }

  containsPoint(entity: Entity, worldX: number, worldY: number) {
    const worldMatrix = entity.matrix.getWorldMatrix();
    const inMatrix = m3.inverse(worldMatrix);
    const localPoint = m3.transformPoint(inMatrix, worldX, worldY);

    const w = entity.size.width;
    const h = entity.size.height;

    const halfWidth = w * 0.5;
    const halfHeight = h * 0.5;

    return localPoint.x >= -halfWidth && localPoint.x <= halfWidth && localPoint.y >= -halfHeight && localPoint.y <= halfHeight;
  }

  private findEntitiesInBoundingBox(boundingBox: BoundingBox, filter?: (entity: Entity) => boolean): Entity[] {
    const allIntersecting: Entity[] = [];
    const tree = this.canvas.world.tree;

    const intersectingIds = tree
      .search(boundingBox)
      .map((item) => item.id);

    for (const id of intersectingIds) {
      const entity = this.canvas.world.getEntityById(id);
      if (entity && (!filter || filter(entity))) {
        allIntersecting.push(entity);
      }
    }

    return allIntersecting;
  }

  pick(options: PickOptionsPoint | PickOptionsBoundingBox): Entity[] | null {
    if ('point' in options) {
      const array = Array.from(this.canvas.world.getEntities());

      for (let i = array.length - 1; i >= 0; i--) {
        const entity = array[i];

        if (this.containsPoint(entity, options.point.x, options.point.y)) {
          if (!options.filter || options.filter(entity)) {
            return [entity];
          }
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
