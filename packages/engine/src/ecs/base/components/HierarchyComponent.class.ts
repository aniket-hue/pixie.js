import { m3 } from '../../../lib/math';
import type { Entity } from '../Entity.class';
import { Dirty } from './DirtyComponent.class';

export class HierarchyComponent {
  public parent: Entity | null = null;
  public children: Entity[] = [];
  public paintIndex = -1;
  private entity: Entity;

  constructor(entity: Entity) {
    this.entity = entity;
  }

  addChild(child: Entity, index = this.children.length): void {
    if (child === this.entity) return;

    if (this.children.includes(child)) {
      return;
    }

    if (child.hierarchy.parent) {
      child.hierarchy.parent.hierarchy.removeChild(child);
    }

    this.children.splice(index, 0, child);

    child.hierarchy.parent = this.entity;

    this.convertChildWorldToLocal(child);

    (this.entity.world ?? child.world)?.onAttach(child);
    child.world?.invalidateOrder();

    child.dirty.markDirty(Dirty.HIERARCHY);
    this.entity.dirty.markDirty(Dirty.HIERARCHY);
  }

  private resetChild(child: Entity): void {
    child.hierarchy.parent = null;

    const worldMatrix = child.matrix.getWorldMatrix();
    child.matrix.setLocalMatrix([...worldMatrix]);

    child.dirty.markDirty(Dirty.HIERARCHY);
  }

  removeChild(child: Entity): void {
    const index = this.children.indexOf(child);
    if (index === -1) return;

    this.resetChild(child);
    this.children.splice(index, 1);
    this.entity.world?.invalidateOrder();
    child.world?.onDetach(child);

    this.entity.dirty.markDirty(Dirty.HIERARCHY);
  }

  private convertChildWorldToLocal(child: Entity): void {
    const parentWorld = this.entity.matrix.getWorldMatrix();
    const parentInv = m3.inverse(parentWorld);

    const childWorld = child.matrix.getWorldMatrix();
    const childLocal = m3.multiply(parentInv, childWorld);

    child.matrix.setLocalMatrix(childLocal);
    child.matrix.setWorldMatrix();
  }
}
