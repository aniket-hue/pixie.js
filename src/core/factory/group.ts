import { Object } from '../entities/Object.class';
import type { ObjectFactory } from '../entities/types';
import { m3 } from '../math';
import type { World } from '../world/World.class';

export function createGroup(objects: Object[]): ObjectFactory {
  return {
    register: (world: World) => {
      const entityId = world.createEntity();
      const groupBounds = {
        minX: 0,
        minY: 0,
        maxX: 0,
        maxY: 0,
      };

      objects.forEach((object) => {
        groupBounds.minX = Math.min(groupBounds.minX, object.bounds.minX);
        groupBounds.minY = Math.min(groupBounds.minY, object.bounds.minY);
        groupBounds.maxX = Math.max(groupBounds.maxX, object.bounds.maxX);
        groupBounds.maxY = Math.max(groupBounds.maxY, object.bounds.maxY);

        world.addComponent('parent', object.entityId, entityId);
      });

      const gcx = (groupBounds.minX + groupBounds.maxX) / 2;
      const gcy = (groupBounds.minY + groupBounds.maxY) / 2;

      const width = groupBounds.maxX - groupBounds.minX;
      const height = groupBounds.maxY - groupBounds.minY;

      world.addComponent('children', entityId, objects);
      world.addComponent('style', entityId, { fill: [0, 0, 0, 0.1], stroke: [0, 0, 0, 1], strokeWidth: 0 });
      world.addComponent('size', entityId, { width, height });
      world.addComponent('interaction', entityId, { draggable: true });
      world.addComponent('transform', entityId, {
        localMatrix: m3.compose({ tx: gcx, ty: gcy, sx: 1, sy: 1, r: 0 }),
      });

      return entityId;
    },
  };
}
