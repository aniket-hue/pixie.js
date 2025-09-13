import type { Constructor, MixinBase } from './types';

export function Parent<T extends Constructor<MixinBase>>(Base: T) {
  return class extends Base {
    get parent() {
      const parent = this.canvas.world.getComponent('parent', this.entityId);
      return parent;
    }
  };
}
