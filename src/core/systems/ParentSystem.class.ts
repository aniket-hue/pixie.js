import type { Object } from '../entities/Object.class';
import type { GraphicsEngine } from '../GraphicsEngine.class';
import { m3 } from '../math';
import { createBoundingBoxOfchildren } from '../utils/createBoundingBoxOfchildren';

export class ParentSystem {
  // biome-ignore lint/correctness/noUnusedPrivateClassMembers: <explanation>
  private context: GraphicsEngine;

  constructor(context: GraphicsEngine) {
    this.context = context;
  }

  update(objects: Object[]) {
    const computedParents = new Set<number>();
    const parentIds = objects
      .filter((object) => object.parent)
      .map((object) => object.parent)
      .filter(Boolean);

    for (const parentId of parentIds) {
      // if (!parentId || computedParents.has(parentId)) {
      //   continue;
      // }
      // computedParents.add(parentId);
      // const children = this.context.world.getComponent('children', parentId);
      // if (!children) {
      //   continue;
      // }
      // const { width, height, localMatrix } = createBoundingBoxOfchildren(children);
      // this.context.world.updateComponent('transform', parentId, { localMatrix, worldMatrix: localMatrix });
      // this.context.world.updateComponent('size', parentId, { width, height });
    }
  }
}
