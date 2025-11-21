import RBush from 'rbush';
import type { Entity } from './Entity.class';

interface TreeItem {
  id: number;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export class World {
  entities: Set<Entity>;
  tree: RBush<TreeItem>;
  treeMap: Map<number, TreeItem>;

  constructor() {
    this.entities = new Set();
    this.tree = new RBush();
    this.treeMap = new Map();
  }

  addEntity(entity: Entity): Entity {
    this.entities.add(entity);

    const bounds = entity.bounds.updateBounds();
    const newBounds = { id: entity.id, ...bounds };

    this.treeMap.set(entity.id, newBounds);
    this.tree.insert(newBounds);

    return entity;
  }

  removeEntity(entity: Entity): void {
    this.entities.delete(entity);

    const bounds = this.treeMap.get(entity.id);

    if (bounds) {
      this.tree.remove(bounds);
      this.treeMap.delete(entity.id);
    }
  }

  getEntities(): Set<Entity> {
    return this.entities;
  }

  getEntityById(id: number): Entity | undefined {
    for (const entity of this.entities) {
      if (entity.id === id) {
        return entity;
      }
    }
    return undefined;
  }

  updateBoundsForDirtyEntities(): void {
    for (const entity of this.entities) {
      if (entity.dirty.dirty) {
        this.updateEntityBounds(entity);
      }
    }
  }

  updateEntityBounds(entity: Entity): void {
    const oldBounds = this.treeMap.get(entity.id);

    if (oldBounds) {
      this.tree.remove(oldBounds);
    }

    const bounds = entity.bounds.updateBounds();
    const newBounds = { id: entity.id, ...bounds };

    this.treeMap.set(entity.id, newBounds);
    this.tree.insert(newBounds);
  }

  getBounds(entity: Entity): { id: number; minX: number; minY: number; maxX: number; maxY: number } | undefined {
    return this.treeMap.get(entity.id);
  }
}
