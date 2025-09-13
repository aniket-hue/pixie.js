import type { Object } from '../entities/Object.class';
import type { GraphicsEngine } from '../GraphicsEngine.class';
import { m3 } from '../math';
import { createBoundingBoxOfchildren } from '../utils/createBoundingBoxOfchildren';

export class TransformSystem {
  private context: GraphicsEngine;

  constructor(context: GraphicsEngine) {
    this.context = context;
  }

  _updateChildren(objects: Object[]) {
    for (const object of objects) {
      const parentMatrix = object.transform.worldMatrix;

      for (const child of object.children ?? []) {
        const newWorldMatrix = m3.multiply(parentMatrix, child.transform.localMatrix);
        child.transform.worldMatrix = newWorldMatrix;

        if (child.children) {
          this._updateChildren([child]);
        }
      }
    }
  }

  _updateParent(parentId: number) {
    if (!parentId) {
      return;
    }

    const children = this.context.world.getComponent('children', parentId);

    if (!children) {
      return;
    }

    const size = this.context.world.getComponent('size', parentId);
    const { width, height, localMatrix } = createBoundingBoxOfchildren(children);

    if (size && size.width === width && size.height === height) {
      return;
    }

    this.context.world.updateComponent('transform', parentId, { localMatrix, worldMatrix: localMatrix });
    this.context.world.updateComponent('size', parentId, { width, height });

    children.forEach((child) => {
      child.transform.localMatrix = m3.multiply(m3.inverse(localMatrix), child.transform.worldMatrix);
    });

    const parentsParent = this.context.world.getComponent('parent', parentId);

    if (parentsParent) {
      this._updateParent(parentsParent);
    }
  }

  update(objects: Object[]) {
    for (const object of objects) {
      if (object.parent) {
        this._updateParent(object.parent);
      }

      if (object.children) {
        this._updateChildren([object]);
      }
    }
  }
}
