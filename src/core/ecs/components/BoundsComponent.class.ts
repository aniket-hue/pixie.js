import { computeBoundsOfMatrix } from '../../utils/computeBoundsOfMatrix';
import type { Entity } from '../Entity.class';

export class BoundsComponent {
  private entity: Entity;

  public minX: number = 0;
  public minY: number = 0;
  public maxX: number = 0;
  public maxY: number = 0;

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
