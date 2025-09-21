import type { Canvas } from '../../Canvas.class';
import { isComputableBounds, updateBounds } from '../components/matrix';

export class BoundsSystem {
  private canvas: Canvas;
  private boundsMapForTree: Map<number, { id: number; minX: number; minY: number; maxX: number; maxY: number }>;

  constructor(canvas: Canvas) {
    this.boundsMapForTree = new Map<number, { id: number; minX: number; minY: number; maxX: number; maxY: number }>();
    this.canvas = canvas;
  }

  update(eids: number[]) {
    for (const eid of eids) {
      if (!isComputableBounds(eid)) {
        continue;
      }

      const oldBounds = this.boundsMapForTree.get(eid);

      if (oldBounds) {
        this.canvas.tree.remove(oldBounds);
      }

      const bounds = updateBounds(eid);
      const newBounds = { id: eid, ...bounds };

      this.boundsMapForTree.set(eid, newBounds);
      this.canvas.tree.insert(newBounds);
    }
  }
}
