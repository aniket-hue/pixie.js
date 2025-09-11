import type { Size } from '../world/types';
import type { Constructor, MixinBase } from './types';

/**
 * Sizable mixin - handles width and height
 */
export function Sizable<T extends Constructor<MixinBase>>(Base: T) {
  return class extends Base {
    // Size component access
    get size() {
      const size = this.canvas.world.getComponent('size', this.entityId);

      if (!size) {
        console.error('Size not found');
        return { width: 0, height: 0 };
      }

      return size;
    }

    set size(size: Size) {
      this.canvas.world.updateComponent('size', this.entityId, size);
    }

    // Width and height
    get width() {
      const size = this.size;
      return size.width;
    }

    get height() {
      const size = this.size;
      return size.height;
    }
  };
}
