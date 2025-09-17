import { getChildren, getParent, isVisible, markVisible } from '../components/';

export class VisibleSystem {
  _updateChildren(eid: number, visible: boolean) {
    for (const child of getChildren(eid) ?? []) {
      markVisible(child, visible);

      if (getChildren(child).length > 0) {
        this._updateChildren(child, visible);
      }
    }
  }

  update(eids: number[]) {
    for (const eid of eids) {
      const parent = getParent(eid);
      const children = getChildren(eid);

      if (parent && isVisible(eid)) {
        markVisible(parent, true);
      }

      if (children.length > 0) {
        this._updateChildren(eid, isVisible(eid));
      }
    }
  }
}
