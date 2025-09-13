import type { Constructor, MixinBase } from './types';

export function Visiblity<T extends Constructor<MixinBase>>(Base: T) {
  return class extends Base {
    get visibility() {
      const visibility = this.canvas.world.getComponent('visibility', this.entityId);

      return visibility?.visible ?? true;
    }

    set visibility(visible: boolean) {
      this.canvas.world.updateComponent('visibility', this.entityId, { visible });
    }
  };
}
