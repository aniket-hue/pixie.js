import type { Entity } from '../Entity.class';

export class VisibilityComponent {
  private entity: Entity;
  public visible: boolean = true;

  constructor(entity: Entity) {
    this.entity = entity;
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    this.entity.dirty.markDirty();
  }

  updateVisibility(): void {
    const parent = this.entity.hierarchy.parent;
    const children = this.entity.hierarchy.children;

    if (parent && this.visible) {
      parent.visibility.setVisible(true);
    }

    if (children.length > 0) {
      this.updateVisibilityRecursive(this.visible);
    }
  }

  updateVisibilityRecursive(visible: boolean): void {
    for (const child of this.entity.hierarchy.children) {
      child.visibility.setVisible(visible);

      if (child.hierarchy.children.length > 0) {
        child.visibility.updateVisibilityRecursive(visible);
      }
    }
  }
}
