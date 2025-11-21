import { m3 } from '../../math';
import { createBoundingBoxOfchildren } from '../../utils/createBoundingBoxOfchildren';
import type { Entity } from '../Entity.class';

export class HierarchyComponent {
  private entity: Entity;

  public parent: Entity | null = null;
  public children: Entity[] = [];

  constructor(entity: Entity) {
    this.entity = entity;
  }

  addChild(child: Entity): void {
    if (this.children.includes(child)) {
      return;
    }

    this.children.push(child);
    child.hierarchy.parent = this.entity;

    this.updateChildrenCoords();
    child.dirty.markDirty();
    this.entity.dirty.markDirty();
  }

  removeChild(child: Entity): void {
    const index = this.children.indexOf(child);
    if (index === -1) {
      return;
    }

    this.children.splice(index, 1);
    child.hierarchy.parent = null;

    // Convert child from local to world space
    const childLocalMatrix = child.matrix.getLocalMatrix();
    const parentWorldMatrix = this.entity.matrix.getWorldMatrix();
    const childWorldMatrix = m3.multiply(parentWorldMatrix, childLocalMatrix);
    child.matrix.setWorldMatrixDirect(childWorldMatrix);
    child.matrix.setLocalMatrixDirect(childWorldMatrix);

    this.updateChildrenCoords();
    child.dirty.markDirty();
    this.entity.dirty.markDirty();
  }

  clearChildren(): void {
    const children = [...this.children];
    const parentWorldMatrix = this.entity.matrix.getWorldMatrix();

    children.forEach((child) => {
      const childLocalMatrix = child.matrix.getLocalMatrix();
      const childWorldMatrix = m3.multiply(parentWorldMatrix, childLocalMatrix);
      child.matrix.setWorldMatrixDirect(childWorldMatrix);
      child.matrix.setLocalMatrixDirect(childWorldMatrix);
      child.hierarchy.parent = null;
      child.dirty.markDirty();
    });

    this.children = [];
    this.updateChildrenCoords();
    this.entity.dirty.markDirty();
  }

  private convertChildrenToLocalSpace(): void {
    if (!this.children.length) {
      return;
    }

    const parentLocalMatrix = this.entity.matrix.getLocalMatrix();
    const parentWorldMatrix = this.entity.matrix.getWorldMatrix();
    const inverseParentLocal = m3.inverse(parentLocalMatrix);

    for (const child of this.children) {
      const childWorldMatrix = child.matrix.getWorldMatrix();
      const childLocalMatrix = m3.multiply(inverseParentLocal, childWorldMatrix);

      child.matrix.setLocalMatrixDirect(childLocalMatrix);

      const newChildWorldMatrix = m3.multiply(parentWorldMatrix, childLocalMatrix);
      child.matrix.setWorldMatrixDirect(newChildWorldMatrix);

      child.dirty.markDirty();
    }
  }

  private updateChildrenCoords(): void {
    if (!this.children.length) {
      return;
    }

    const { width, height, localMatrix: parentLocalMatrix } = createBoundingBoxOfchildren(this.children);

    this.entity.matrix.setLocalMatrixDirect(parentLocalMatrix);

    const parentParent = this.entity.hierarchy.parent;
    if (parentParent) {
      const parentParentWorld = parentParent.matrix.getWorldMatrix();
      const parentWorldMatrix = m3.multiply(parentParentWorld, parentLocalMatrix);
      this.entity.matrix.setWorldMatrixDirect(parentWorldMatrix);
    } else {
      this.entity.matrix.setWorldMatrixDirect(parentLocalMatrix);
    }

    this.entity.size.setWidth(width);
    this.entity.size.setHeight(height);

    this.convertChildrenToLocalSpace();
  }
}

