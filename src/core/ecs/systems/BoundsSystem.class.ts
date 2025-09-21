import type { Canvas } from '../../Canvas.class';
import { getCanNotBeSelectedBySelection } from '../components';
import { Bounds, updateBounds } from '../components/matrix';

export class BoundsSystem {
  private canvas: Canvas;
  private boundsMapForTree: Map<number, { id: number; minX: number; minY: number; maxX: number; maxY: number }>;

  constructor(canvas: Canvas) {
    this.boundsMapForTree = new Map<number, { id: number; minX: number; minY: number; maxX: number; maxY: number }>();
    this.canvas = canvas;
  }

  getBounds(eid: number): { id: number; minX: number; minY: number; maxX: number; maxY: number } | undefined {
    return this.boundsMapForTree.get(eid);
  }

  removeBounds(eid: number) {
    const bounds = this.boundsMapForTree.get(eid);

    if (bounds) {
      this.canvas.tree.remove(bounds);
      this.boundsMapForTree.delete(eid);
    }
  }

  _updateBounds(eid: number) {
    const oldBounds = this.boundsMapForTree.get(eid);

    if (oldBounds) {
      this.canvas.tree.remove(oldBounds);
    }

    const bounds = updateBounds(eid);
    const newBounds = { id: eid, ...bounds };

    this.boundsMapForTree.set(eid, newBounds);
    this.canvas.tree.insert(newBounds);
  }

  update(eids: number[]) {
    for (const eid of eids) {
      if (!this.canvas.world.hasComponent(Bounds, eid)) {
        continue;
      }

      this._updateBounds(eid);
    }
  }
}
