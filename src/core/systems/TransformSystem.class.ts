import type { Object } from '../entities/Object.class';
import type { GraphicsEngine } from '../GraphicsEngine.class';
import { m3 } from '../math';

export class TransformSystem {
  //   private context: GraphicsEngine;

  constructor(_context: GraphicsEngine) {
    // this.context = context;
  }

  update(objects: Object[]) {
    const objectsWithChildrens = objects.filter((object) => object.children);

    for (const object of objectsWithChildrens) {
      const parentMatrix = object.transform.worldMatrix;
      console.log(parentMatrix);

      if (object.children) {
        for (const child of object.children) {
          const newWorldMatrix = m3.multiply(parentMatrix, child.transform.localMatrix);
          child.transform = { localMatrix: child.transform.localMatrix, worldMatrix: newWorldMatrix };
        }
      }
    }
  }
}
