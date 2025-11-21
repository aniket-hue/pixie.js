import type { Entity } from '../Entity.class';

export class SizeComponent {
  public width: number = 0;
  public height: number = 0;
  private entity: Entity;

  constructor(entity: Entity) {
    this.entity = entity;
  }

  setWidth(width: number): void {
    this.width = width;
    this.entity.dirty.markDirty();
  }

  setHeight(height: number): void {
    this.height = height;
    this.entity.dirty.markDirty();
  }
}
