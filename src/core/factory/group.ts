import type { Object } from '../entities/Object.class';
import type { ObjectFactory } from '../entities/types';
import { m3 } from '../math';
import { createBoundingBoxOfchildren } from '../utils/createBoundingBoxOfchildren';
import type { World } from '../world/World.class';

export function createGroup(objects: Object[]): ObjectFactory {
  return {
    register: (world: World) => {
      const entityId = world.createEntity();

      const { localMatrix, width, height } = createBoundingBoxOfchildren(objects);

      world.addComponent('children', entityId, objects);
      world.addComponent('style', entityId, { fill: [0, 0, 0, 0.1], stroke: [0, 0, 0, 1], strokeWidth: 0 });
      world.addComponent('size', entityId, { width, height });
      world.addComponent('interaction', entityId, { draggable: true });
      world.addComponent('transform', entityId, {
        localMatrix,
        worldMatrix: localMatrix,
      });
      world.addComponent('visibility', entityId, { visible: true });
      world.addComponent('group', entityId, { isGroup: true });

      objects.forEach((child) => {
        child.transform.localMatrix = m3.multiply(m3.inverse(localMatrix), child.transform.worldMatrix);
        world.addComponent('parent', child.entityId, entityId);
      });

      return entityId;
    },
  };
}
