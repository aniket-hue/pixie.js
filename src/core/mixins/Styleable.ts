import type { Style } from '../world/types';
import type { Constructor, MixinBase } from './types';

/**
 * Styleable mixin - handles visual styling
 */
export function Styleable<T extends Constructor<MixinBase>>(Base: T) {
  return class extends Base {
    // Style component access
    get style(): Style {
      const style = this.canvas.world.getComponent('style', this.entityId);

      if (!style) {
        console.error('Style not found');
        return { fill: [0, 0, 0, 1], stroke: [0, 0, 0, 1], strokeWidth: 0 };
      }

      return style;
    }
  };
}
