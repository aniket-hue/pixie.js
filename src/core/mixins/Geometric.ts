import { m3 } from '../math';
import { computeBoundsOfMatrix } from '../utils/computeBoundsOfMatrix';
import type { Constructor, MixinBase } from './types';

export function Geometric<T extends Constructor<MixinBase>>(Base: T) {
  return class extends Base {
    get bounds() {
      //@ts-expect-error
      const transform = this.transform;
      //@ts-expect-error
      const size = this.size;

      if (!transform || !size) {
        return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
      }

      const m = transform.worldMatrix;
      const w = 'width' in size ? (size.width ?? 0) : (size.radius ?? 0) * 2;
      const h = 'height' in size ? (size.height ?? 0) : (size.radius ?? 0) * 2;

      return computeBoundsOfMatrix({
        matrix: m,
        size: {
          width: w,
          height: h,
        },
      });
    }

    containsPoint(worldX: number, worldY: number) {
      const transform = (this as any).transform;
      const size = (this as any).size;

      if (!transform || !size) {
        return false;
      }

      const matrix = transform.worldMatrix;
      const inMatrix = m3.inverse(matrix);
      const localPoint = m3.transformPoint(inMatrix, worldX, worldY);

      const halfWidth = 'radius' in size ? (size.radius ?? 0) : (size.width ?? 0) * 0.5;
      const halfHeight = 'radius' in size ? (size.radius ?? 0) : (size.height ?? 0) * 0.5;

      return localPoint.x >= -halfWidth && localPoint.x <= halfWidth && localPoint.y >= -halfHeight && localPoint.y <= halfHeight;
    }
  };
}
