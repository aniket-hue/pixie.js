import type { Object } from '../entities/Object.class';
import type { Constructor, MixinBase } from './types';

export function Children<T extends Constructor<MixinBase>>(Base: T) {
  return class extends Base {
    addChild(object: Object) {
      const existingChildren = this.canvas.world.getComponent('children', this.entityId);

      if (!existingChildren) {
        this.canvas.world.addComponent('children', this.entityId, [object]);
        this.canvas.world.markDirty(this.entityId);

        return;
      }

      const newChildren = [...existingChildren, object];
      this.canvas.world.updateComponent('children', this.entityId, newChildren);
      this.canvas.world.markDirty(this.entityId);
    }

    removeChild(object: Object) {
      const existingChildren = this.canvas.world.getComponent('children', this.entityId);

      if (!existingChildren) {
        return;
      }

      const newChildren = existingChildren.filter((child) => child.entityId !== object.entityId);
      this.canvas.world.updateComponent('children', this.entityId, newChildren);
      this.canvas.world.markDirty(this.entityId);
    }

    get children() {
      const children = this.canvas.world.getComponent('children', this.entityId);
      return children;
    }
  };
}
