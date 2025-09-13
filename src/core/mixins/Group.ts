import type { Constructor, MixinBase } from './types';

export function Group<T extends Constructor<MixinBase>>(Base: T) {
  return class extends Base {
    get isGroup() {
      const group = this.canvas.world.getComponent('group', this.entityId);
      return group?.isGroup ?? false;
    }
  };
}
