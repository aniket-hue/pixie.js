import type { Object } from '../entities/Object.class';
import type { GraphicsEngine } from '../GraphicsEngine.class';
import { m3 } from '../math';

export class ChildrenSystem {
  private context: GraphicsEngine;

  constructor(context: GraphicsEngine) {
    this.context = context;
  }

  _update(objects: Object[]) {
    for (const object of objects) {
      const parentMatrix = object.transform.worldMatrix;

      for (const child of object.children ?? []) {
        const newWorldMatrix = m3.multiply(parentMatrix, child.transform.localMatrix);
        child.transform.worldMatrix = newWorldMatrix;

        if (child.children) {
          this._update([child]);
        }
      }
    }
  }

  update(objects: Object[]) {
    const objectsWithChildrens = objects.filter((object) => object.children);
    this._update(objectsWithChildrens);
  }
}
