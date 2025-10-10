import type { Canvas } from '../../Canvas.class';
import { setBounds } from '../components';

export class BoundsSystem {
  private canvas: Canvas;

  constructor(canvas: Canvas) {
    this.canvas = canvas;
  }

  getBounds(eid: number): { id: number; minX: number; minY: number; maxX: number; maxY: number } | undefined {
    return this.canvas.world.treeMap.get(eid);
  }

  removeBounds(eid: number) {
    const bounds = this.canvas.world.treeMap.get(eid);

    if (bounds) {
      this.canvas.world.tree.remove(bounds);
      this.canvas.world.treeMap.delete(eid);
    }
  }

  _updateBounds(eid: number) {
    const oldBounds = this.canvas.world.treeMap.get(eid);

    if (oldBounds) {
      this.canvas.world.tree.remove(oldBounds);
    }

    const bounds = setBounds(eid);
    const newBounds = { id: eid, ...bounds };

    this.canvas.world.treeMap.set(eid, newBounds);
    this.canvas.world.tree.insert(newBounds);
  }

  update(eids: number[]) {
    for (const eid of eids) {
      this._updateBounds(eid);
    }
  }
}
