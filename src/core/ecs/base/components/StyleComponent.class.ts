import type { Entity } from '../Entity.class';

export class StyleComponent {
  private entity: Entity;

  public fill: number = 0;
  public stroke: number = 0;
  public strokeWidth: number = 0;

  constructor(entity: Entity) {
    this.entity = entity;
  }

  setFill(fill: number): void {
    this.fill = fill;
    this.entity.dirty.markDirty();
  }

  setStroke(stroke: number): void {
    this.stroke = stroke;
    this.entity.dirty.markDirty();
  }

  setStrokeWidth(strokeWidth: number): void {
    this.strokeWidth = strokeWidth;
    this.entity.dirty.markDirty();
  }
}
