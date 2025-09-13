import { m3 } from '../../math';
import type { World } from '../../world/World.class';
import type { IRectangleConstructorData } from './types';

export function createRectangle({
  x,
  y,
  width,
  height,
  fill = [0, 0, 0, 1],
  stroke = [1, 0, 0, 1],
  strokeWidth = 0,
  angle = 0,
  scaleX = 1,
  scaleY = 1,
}: IRectangleConstructorData) {
  return {
    register: (world: World) => {
      const entityId = world.createEntity();
      const localMatrix = m3.compose({ tx: x, ty: y, sx: scaleX, sy: scaleY, r: angle });

      world.addComponent('style', entityId, { fill, stroke, strokeWidth });

      world.addComponent('size', entityId, {
        width,
        height,
      });

      world.addComponent('interaction', entityId, {
        draggable: true,
        selectable: true,
      });

      world.addComponent('transform', entityId, {
        localMatrix,
        worldMatrix: localMatrix,
      });

      world.addComponent('visibility', entityId, { visible: true });

      return entityId;
    },
  };
}
