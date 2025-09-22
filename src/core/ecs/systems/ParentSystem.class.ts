import { m3 } from '../../math';
import { createBoundingBoxOfchildren } from '../../utils/createBoundingBoxOfchildren';
import {
  getChildren,
  getHeight,
  getParent,
  getWidth,
  getWorldMatrix,
  markDirty,
  setHeight,
  setLocalMatrix,
  setWidth,
  setWorldMatrix,
} from '../components';

export class ParentSystem {
  private _updateParent(parentId: number) {
    const children = getChildren(parentId);

    if (children.length === 0) return;

    const pW = getWidth(parentId);
    const pH = getHeight(parentId);

    const { width, height, localMatrix } = createBoundingBoxOfchildren(children);

    if (pW === width && pH === height) {
      return;
    }

    setLocalMatrix(parentId, localMatrix);
    setWorldMatrix(parentId, localMatrix);

    setWidth(parentId, width);
    setHeight(parentId, height);

    markDirty(parentId);
    const inverseLocalMatrix = m3.inverse(localMatrix);

    for (const child of children) {
      const childWorldMatrix = getWorldMatrix(child);

      const matrix = m3.multiply(inverseLocalMatrix, childWorldMatrix);
      setLocalMatrix(child, matrix);

      markDirty(child);
    }

    const parentsParent = getParent(parentId);
    if (parentsParent) {
      this._updateParent(parentsParent);
    }
  }

  update(eids: number[]) {
    const processed = new Set<number>();

    for (const eid of eids) {
      if (processed.has(eid)) {
        continue;
      }

      processed.add(eid);

      if (typeof getParent(eid) === 'number') {
        this._updateParent(getParent(eid));
      }
    }
  }
}
