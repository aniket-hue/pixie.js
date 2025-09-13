import { m3 } from '../math';
import type { Transform } from '../world/types';
import type { Constructor, MixinBase } from './types';

/**
 * Transformable mixin - handles position, rotation, and scale
 */
export function Transformable<T extends Constructor<MixinBase>>(Base: T) {
  return class extends Base {
    // Transform component access
    get transform() {
      const transform = this.canvas.world.getComponent('transform', this.entityId);

      if (!transform) {
        console.error('Transform not found');
        return { localMatrix: m3.identity(), worldMatrix: m3.identity() };
      }

      return transform;
    }

    set transform(transform: Transform) {
      this.canvas.world.updateComponent('transform', this.entityId, transform);
    }

    // Position
    get x() {
      const matrix = this.transform.localMatrix;
      return matrix[6];
    }

    set x(worldX: number) {
      /**
       * We need to convert matrix translations to world coordinates, because transform system recalculates
       * bounding box again and change child matrices
       */
      this.transform.localMatrix[6] = worldX;
      this.transform.worldMatrix[6] = worldX;
    }

    get y() {
      const matrix = this.transform.localMatrix;
      return matrix[7];
    }

    set y(worldY: number) {
      /**
       * We need to convert matrix translations to world coordinates, because transform system recalculates
       * bounding box again and change child matrices
       */
      this.transform.worldMatrix[7] = worldY;
      this.transform.localMatrix[7] = worldY;
    }

    // Rotation
    get rotation() {
      const matrix = this.transform.localMatrix;
      return matrix[3];
    }

    set rotation(angle: number) {
      const matrix = this.transform.localMatrix;
      matrix[3] = angle;
      matrix[4] = angle;
      this.transform.localMatrix = matrix;
    }

    // Scale
    get scaleX() {
      const matrix = this.transform.localMatrix;
      return matrix[0];
    }

    set scaleX(scale: number) {
      const matrix = this.transform.localMatrix;
      matrix[0] = scale;
      this.transform.localMatrix = matrix;
    }

    set scaleY(scale: number) {
      const matrix = this.transform.localMatrix;
      matrix[4] = scale;
      this.transform.localMatrix = matrix;
    }
  };
}
