import { computeBoundsOfMatrix } from '../../../utils/computeBoundsOfMatrix';
import type { BoundingBox } from '../../../../types';
import type { Entity } from '../Entity.class';

export type IndexedBox = BoundingBox & { entity: Entity };

export class BoundsComponent {
  private entity: Entity;

  public minX: number = 0;
  public minY: number = 0;
  public maxX: number = 0;
  public maxY: number = 0;
  /** This entity's R-tree entry. Kept because removing it needs the box it was inserted with, not the current one. */
  public indexed: IndexedBox | null = null;

  constructor(entity: Entity) {
    this.entity = entity;
  }

  updateBounds(): { minX: number; minY: number; maxX: number; maxY: number } {
    const worldMatrix = this.entity.matrix.getWorldMatrix();
    const size = { width: this.entity.size.width, height: this.entity.size.height };
    const bounds = computeBoundsOfMatrix({ matrix: worldMatrix, size });

    this.minX = bounds.minX;
    this.minY = bounds.minY;
    this.maxX = bounds.maxX;
    this.maxY = bounds.maxY;

    return bounds;
  }
}
