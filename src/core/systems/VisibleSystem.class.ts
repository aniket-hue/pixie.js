import type { Object } from '../entities/Object.class';
import type { GraphicsEngine } from '../GraphicsEngine.class';

export class VisibleSystem {
  private context: GraphicsEngine;

  constructor(context: GraphicsEngine) {
    this.context = context;
  }

  _updateChildren(object: Object, visible: boolean) {
    for (const child of object.children ?? []) {
      child.visibility = visible;
      this._updateChildren(child, visible);
    }
  }

  update(objects: Object[]) {
    for (const object of objects) {
      if (object.parent && object.visibility) {
        this.context.world.updateComponent('visibility', object.parent, { visible: object.visibility });
      }

      if (object.children) {
        this._updateChildren(object, object.visibility);
      }
    }
  }
}
