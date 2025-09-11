import type { Canvas } from '../Canvas.class';
import type { World } from '../world/World.class';

/**
 * Base interface for all mixins
 */
export interface MixinBase {
  readonly canvas: Canvas;
  readonly entityId: number;
  readonly world: World;
}

/**
 * Mixin constructor type
 */
export type Constructor<T = {}> = new (...args: any[]) => T;
