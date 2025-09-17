import { m3 } from '../../math';
import { getChildren, getLocalMatrix, getWorldMatrix, updateWorldMatrix } from '../components';

export class ChildrenSystem {
  private _updateChildren(parentId: number) {
    const parentMatrix = getWorldMatrix(parentId);
    const children = getChildren(parentId);

    for (const child of children) {
      const localMatrix = getLocalMatrix(child);

      const newWorldMatrix = m3.multiply(parentMatrix, localMatrix);

      updateWorldMatrix(child, newWorldMatrix);

      if (getChildren(child).length > 0) {
        this._updateChildren(child);
      }
    }
  }

  update(eids: number[]) {
    for (const eid of eids) {
      if (getChildren(eid).length > 0) {
        this._updateChildren(eid);
      }
    }
  }
}
