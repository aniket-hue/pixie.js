import { m3 } from '../../math';
import type { Entity } from '../Entity.class';

export class MatrixComponent {
  private localMatrix: number[] = [1, 0, 0, 0, 1, 0, 0, 0, 1];
  private worldMatrix: number[] = [1, 0, 0, 0, 1, 0, 0, 0, 1];
  private entity: Entity;

  constructor(entity: Entity) {
    this.entity = entity;
  }

  /**
   * Direct set functions - no propagation (for internal use)
   */
  setWorldMatrixDirect(matrix: number[]): void {
    this.worldMatrix = [...matrix];
  }

  setLocalMatrixDirect(matrix: number[]): void {
    this.localMatrix = [...matrix];
  }

  /**
   * Set local matrix with propagation
   * Updates world matrix based on parent, then propagates to children
   */
  setLocalMatrix(matrix: number[]): void {
    this.setLocalMatrixDirect(matrix);

    const parent = this.entity.hierarchy.parent;
    if (parent) {
      const parentWorldMatrix = parent.matrix.getWorldMatrix();
      const newWorldMatrix = m3.multiply(parentWorldMatrix, matrix);
      this.setWorldMatrixDirect(newWorldMatrix);
    } else {
      this.setWorldMatrixDirect(matrix);
    }

    this.updateChildMatrices();
    this.entity.dirty.markDirty();
  }

  /**
   * Set world matrix with propagation
   * If entity has parent, converts world to local, then propagates to children
   */
  setWorldMatrix(matrix: number[]): void {
    const parent = this.entity.hierarchy.parent;

    if (parent) {
      const parentWorldMatrix = parent.matrix.getWorldMatrix();
      const inverseParentWorld = m3.inverse(parentWorldMatrix);
      const newLocalMatrix = m3.multiply(inverseParentWorld, matrix);
      this.setLocalMatrixDirect(newLocalMatrix);
    } else {
      this.setLocalMatrixDirect(matrix);
    }

    this.setWorldMatrixDirect(matrix);
    this.updateChildMatrices();
    this.entity.dirty.markDirty();
  }

  getWorldMatrix(): number[] {
    return [...this.worldMatrix];
  }

  getLocalMatrix(): number[] {
    return [...this.localMatrix];
  }

  updateChildMatrices(): void {
    const children = this.entity.hierarchy.children;

    if (!children.length) {
      return;
    }

    const worldMatrix = this.getWorldMatrix();

    for (const child of children) {
      const childLocalMatrix = child.matrix.getLocalMatrix();
      const newChildWorldMatrix = m3.multiply(worldMatrix, childLocalMatrix);

      child.matrix.setWorldMatrixDirect(newChildWorldMatrix);
      child.dirty.markDirty();

      child.matrix.updateChildMatrices();
    }
  }
}
