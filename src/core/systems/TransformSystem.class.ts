import type { Object } from '../entities/Object.class';
import type { GraphicsEngine } from '../GraphicsEngine.class';
import { m3 } from '../math';

export class TransformSystem {
  //   private context: GraphicsEngine;

  constructor(_context: GraphicsEngine) {
    // this.context = context;
  }

  update(objects: Object[]) {}
}
