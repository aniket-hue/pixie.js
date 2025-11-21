import { iterateReverse } from '../../shared/array';
import type { BoundingBox, Point } from '../../types';
import type { Canvas } from '../Canvas.class';
import type { Entity } from '../ecs/base/Entity.class';
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

    const intersectingIds = tree.search(boundingBox).map((item) => item.id);

    for (const id of intersectingIds) {
      const entity = this.canvas.world.getEntityById(id);
      if (entity && (!filter || filter(entity))) {
        allIntersecting.push(entity);
      }
    }

    return allIntersecting;
  }

  pick(options: PickOptionsPoint | PickOptionsBoundingBox, entities = Array.from(this.canvas.world.getEntities())): Entity[] | null {
    if ('point' in options) {
      let selectedEntities: Entity[] = [];

      for (let i = entities.length - 1; i >= 0; i--) {
        const entity = entities[i];

        if (options.filter?.(entity) === false) {
          continue;
        }

        const isIntersecting = this.containsPoint(entity, options.point.x, options.point.y);

        if (!isIntersecting) {
          continue;
        }

        if (entity.hierarchy.children.length) {
          const childrens = this.pick({ point: options.point, filter: options.filter }, entity.hierarchy.children);

          if (childrens?.length) {
            selectedEntities = childrens;
            break;
          }
        }

        selectedEntities = [entity];

        break;
      }

      if (selectedEntities.length) {
        return selectedEntities;
      }

      return null;
    }

    if ('boundingBox' in options) {
      return this.findEntitiesInBoundingBox(options.boundingBox, options.filter);
    }

    return null;
  }
}
