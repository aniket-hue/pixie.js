import { m3 } from '../../../math';
import type { Entity } from '../Entity.class';

export class HierarchyComponent {
  public parent: Entity | null = null;
  public children: Entity[] = [];
  private entity: Entity;

  private childrenWithGroupsToRevertBack: Record<number, Entity> = {};

  constructor(entity: Entity) {
    this.entity = entity;
  }

  addChild(child: Entity): void {
    if (child === this.entity) return;

    if (this.children.includes(child)) {
      return;
    }

    if (child.hierarchy.parent) {
      this.childrenWithGroupsToRevertBack[child.id] = child.hierarchy.parent;
      child.hierarchy.parent.hierarchy.removeChild(child);
    }

    this.children.push(child);

    child.hierarchy.parent = this.entity;

    this.convertChildWorldToLocal(child);

    child.dirty.markDirty();
    this.entity.dirty.markDirty();
  }

  private resetChild(child: Entity): void {
    child.hierarchy.parent = null;

    if (this.childrenWithGroupsToRevertBack[child.id]) {
      const oldParent = this.childrenWithGroupsToRevertBack[child.id];
      oldParent.hierarchy.addChild(child);
      delete this.childrenWithGroupsToRevertBack[child.id];
    } else {
      const worldMatrix = child.matrix.getWorldMatrix();
      child.matrix.setLocalMatrix([...worldMatrix]);
    }

    child.dirty.markDirty();
  }

  removeChild(child: Entity): void {
    const index = this.children.indexOf(child);
    if (index === -1) return;

    this.resetChild(child);
    this.children.splice(index, 1);

    this.entity.dirty.markDirty();
  }

  clearChildren(): void {
    for (const child of this.children) {
      this.resetChild(child);
    }

    this.children = [];
    this.entity.dirty.markDirty();
  }

  doesChildBelongToGroup(child: Entity): boolean {
    return this.children.includes(child);
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
