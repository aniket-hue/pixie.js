import { m3 } from '../../../math';
import type { Entity } from '../Entity.class';

export class MatrixComponent {
  private localMatrix: number[] = [1, 0, 0, 0, 1, 0, 0, 0, 1];
  private worldMatrix: number[] = [1, 0, 0, 0, 1, 0, 0, 0, 1];
  private entity: Entity;

  constructor(entity: Entity) {
    this.entity = entity;
  }

  setLocalMatrix(matrix: number[]): void {
    this.localMatrix = [...matrix];

    this.entity.dirty.markDirty();
  }

  setWorldMatrix(): void {
    const parent = this.entity.hierarchy.parent;
    const localMatrix = this.getLocalMatrix();

    if (parent) {
      this.worldMatrix = m3.multiply(parent.matrix.worldMatrix, localMatrix);
    } else {
      this.worldMatrix = [...localMatrix];
    }

    const children = this.entity.hierarchy.children;

    for (const child of children) {
      child.matrix.setWorldMatrix();
    }
  }

  getWorldMatrix(): number[] {
    return [...this.worldMatrix];
  }

  getLocalMatrix(): number[] {
    return [...this.localMatrix];
  }
}
