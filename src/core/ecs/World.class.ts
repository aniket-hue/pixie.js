import RBush from 'rbush';
import type { BoundingBox } from '../../types';
import type { Entity } from './base/Entity.class';
import { DirtyMasks } from './base/components/DirtyComponent.class';

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

  private byId: Map<number, Entity>;
  private texturedRemoved = false;

  constructor() {
    this.entities = new Set();
    this.tree = new RBush();
    this.treeMap = new Map();
    this.byId = new Map();
  }

  addEntity(entity: Entity): Entity {
    this.register(entity);

    return entity;
  }

  private register(entity: Entity): void {
    if (this.entities.has(entity)) {
      return;
    }

    this.entities.add(entity);
    this.byId.set(entity.id, entity);
    entity.world = this;

    this.indexBounds(entity);

    for (const child of entity.hierarchy.children) {
      this.register(child);
    }
  }

  removeEntity(entity: Entity): void {
    if (!this.entities.has(entity)) {
      return;
    }

    entity.hierarchy.parent?.hierarchy.removeChild(entity);

    this.unregisterSubtree(entity);
  }

  /** Unlike removeEntity, keeps the children in the world as roots. */
  dissolve(entity: Entity): Entity[] {
    const children = [...entity.hierarchy.children];

    entity.hierarchy.clearChildren();
    this.removeEntity(entity);

    return children;
  }

  private unregisterSubtree(entity: Entity): void {
    for (const child of [...entity.hierarchy.children]) {
      this.unregisterSubtree(child);
    }

    this.entities.delete(entity);
    this.byId.delete(entity.id);
    entity.world = null;

    const bounds = this.treeMap.get(entity.id);

    if (bounds) {
      this.tree.remove(bounds);
      this.treeMap.delete(entity.id);
    }

    if (entity.texture) {
      this.texturedRemoved = true;
    }
  }

  /** True once per batch of removals that included a textured entity. */
  takeTexturedRemoval(): boolean {
    const removed = this.texturedRemoved;
    this.texturedRemoved = false;

    return removed;
  }

  getLiveTextureUrls(): Set<string> {
    const urls = new Set<string>();

    for (const entity of this.entities) {
      if (entity.texture) {
        urls.add(entity.texture.data.url);
      }
    }

    return urls;
  }

  /** Register a child added to an entity already in this world. */
  onAttach(child: Entity): void {
    if (!this.entities.has(child)) {
      this.register(child);
    }
  }

  getEntities(): Set<Entity> {
    return this.entities;
  }

  getEntityById(id: number): Entity | undefined {
    return this.byId.get(id);
  }

  /** Refreshes the spatial index for everything whose bounds changed this frame. */
  reindexDirty(): void {
    for (const entity of this.entities) {
      if (entity.dirty.isDirty(DirtyMasks.BOUNDS)) {
        this.updateEntityBounds(entity);
      }
    }
  }

  updateEntityBounds(entity: Entity): void {
    const oldBounds = this.treeMap.get(entity.id);

    if (oldBounds) {
      this.tree.remove(oldBounds);
    }

    this.indexBounds(entity);
  }

  private indexBounds(entity: Entity): void {
    const bounds = entity.bounds.updateBounds();
    const newBounds = { id: entity.id, ...bounds };

    this.treeMap.set(entity.id, newBounds);
    this.tree.insert(newBounds);
  }

  getBounds(entity: Entity): { id: number; minX: number; minY: number; maxX: number; maxY: number } | undefined {
    return this.treeMap.get(entity.id);
  }

  getSceneBounds(): BoundingBox | null {
    const scene: BoundingBox = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };

    for (const entity of this.entities) {
      const bounds = entity.bounds.updateBounds();

      scene.minX = Math.min(scene.minX, bounds.minX);
      scene.minY = Math.min(scene.minY, bounds.minY);
      scene.maxX = Math.max(scene.maxX, bounds.maxX);
      scene.maxY = Math.max(scene.maxY, bounds.maxY);
    }

    return Number.isFinite(scene.minX) ? scene : null;
  }
}
