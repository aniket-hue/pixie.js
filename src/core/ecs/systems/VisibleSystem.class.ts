import { getChildren, getParent, isVisible, setVisible } from '../components/';

export class VisibleSystem {
  _updateChildren(eid: number, visible: boolean) {
    for (const child of getChildren(eid) ?? []) {
      setVisible(child, visible);

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
        setVisible(parent, true);
      }

      if (children.length > 0) {
        this._updateChildren(eid, isVisible(eid));
      }
    }
  }
}
