import RBush from "rbush";
import type { BoundingBox, Point } from "../../types";
import { containsPoint, intersectsBox } from "../utils/shapes";
import type { Entity } from "./base/Entity.class";
import type { IndexedBox } from "./base/components/BoundsComponent.class";
import { Dirty, DirtyMasks } from "./base/components/DirtyComponent.class";

export type Query = { point: Point } | { box: BoundingBox };

const INDEXED = DirtyMasks.BOUNDS | Dirty.STYLE;

export class World {
  private tree = new RBush<IndexedBox>();
  private moved = new Set<Entity>();
  private orderDirty = true;
  private roots: Entity[] = [];
  private count = 0;

  private onDirty = (entity: Entity, channels: number) => {
    if (channels & INDEXED) this.moved.add(entity);
  };

  addEntity(entity: Entity): Entity {
    if (entity.world === this) {
      return entity;
    }

    if (!this.hasParentHere(entity)) {
      this.roots.push(entity);
    }

    this.register(entity);

    return entity;
  }

  private register(entity: Entity): void {
    if (entity.world === this) {
      return;
    }

    entity.world = this;
    entity.dirty.setListener(this.onDirty);
    this.count++;

    this.indexBounds(entity);
    this.orderDirty = true;

    for (const child of entity.hierarchy.children) {
      this.register(child);
    }
  }

  removeEntity(entity: Entity): void {
    if (entity.world !== this) {
      return;
    }

    entity.hierarchy.parent?.hierarchy.removeChild(entity);

    this.unregisterSubtree(entity);
  }

  private unregisterSubtree(entity: Entity): void {
    for (const child of [...entity.hierarchy.children]) {
      this.unregisterSubtree(child);
    }

    this.moved.delete(entity);
    entity.world = null;
    entity.dirty.setListener(null);
    this.count--;
    this.orderDirty = true;

    if (entity.bounds.indexed) {
      this.tree.remove(entity.bounds.indexed);
      entity.bounds.indexed = null;
    }
  }

  onAttach(child: Entity): void {
    this.register(child);
    this.orderDirty = true;
  }

  onDetach(child: Entity): void {
    if (child.world !== this) return;

    this.roots.push(child);
    this.orderDirty = true;
  }

  get size(): number {
    return this.count;
  }

  forEach(callback: (entity: Entity) => void): void {
    this.ensureOrder();

    const visit = (entity: Entity) => {
      callback(entity);
      entity.hierarchy.children.forEach(visit);
    };
    this.roots.forEach(visit);
  }

  liveTextureUrls(): Set<string> {
    const urls = new Set<string>();

    this.forEach((entity) => {
      if (entity.texture) urls.add(entity.texture.data.url);
    });

    return urls;
  }

  private hasParentHere(entity: Entity): boolean {
    return entity.hierarchy.parent?.world === this;
  }

  invalidateOrder(): void {
    this.orderDirty = true;
  }

  getRoots(): readonly Entity[] {
    this.ensureOrder();
    return this.roots;
  }

  getPaintOrder(): Entity[] {
    const list: Entity[] = [];
    this.forEach((entity) => list.push(entity));
    return list;
  }

  siblingsOf(entity: Entity): Entity[] {
    this.ensureOrder();

    if (this.hasParentHere(entity)) {
      return entity.hierarchy.parent!.hierarchy.children;
    }

    return this.roots;
  }

  paintIndexOf(entity: Entity): number {
    this.ensureOrder();
    return entity.hierarchy.paintIndex;
  }

  private ensureOrder(): void {
    if (!this.orderDirty) return;

    // Roots go stale lazily; keeping the last copy puts a re-added entity on top.
    const kept = new Set<Entity>();
    for (let i = this.roots.length - 1; i >= 0; i--) {
      const entity = this.roots[i];
      if (entity.world === this && !this.hasParentHere(entity)) {
        kept.add(entity);
      }
    }
    this.roots = [...kept].reverse();

    let index = 0;
    const visit = (entity: Entity) => {
      entity.hierarchy.paintIndex = index++;
      entity.hierarchy.children.forEach(visit);
    };
    this.roots.forEach(visit);

    this.orderDirty = false;
  }

  flushBounds(): void {
    for (const entity of this.moved) {
      if (entity.bounds.indexed) this.tree.remove(entity.bounds.indexed);
      this.indexBounds(entity);
    }

    this.moved.clear();
  }

  private indexBounds(entity: Entity): void {
    const bounds = entity.bounds.updateBounds();
    const m = entity.matrix.getWorldMatrix();
    const pad =
      entity.style.strokeWidth *
      Math.max(Math.hypot(m[0], m[1]), Math.hypot(m[3], m[4]));
    const indexed = {
      entity,
      minX: bounds.minX - pad,
      minY: bounds.minY - pad,
      maxX: bounds.maxX + pad,
      maxY: bounds.maxY + pad,
    };

    entity.bounds.indexed = indexed;
    this.tree.insert(indexed);
  }

  search(box: BoundingBox): Entity[] {
    this.flushBounds();
    this.ensureOrder();

    return this.tree
      .search(box)
      .map((item) => item.entity)
      .sort((a, b) => a.hierarchy.paintIndex - b.hierarchy.paintIndex);
  }

  query(query: Query, filter?: (entity: Entity) => boolean): Entity[] {
    this.flushBounds();
    this.ensureOrder();

    const isPoint = "point" in query;
    let box: BoundingBox;
    if (isPoint) {
      box = {
        minX: query.point.x,
        minY: query.point.y,
        maxX: query.point.x,
        maxY: query.point.y,
      };
    } else {
      box = query.box;
    }

    const hits: Entity[] = [];

    for (const { entity } of this.tree.search(box)) {
      if (filter && !filter(entity)) continue;

      let hit: boolean;
      if (isPoint) {
        hit = containsPoint(entity, query.point);
      } else {
        hit = intersectsBox(entity, box);
      }

      if (hit) hits.push(entity);
    }

    return hits.sort(
      (a, b) => b.hierarchy.paintIndex - a.hierarchy.paintIndex,
    );
  }

  getSceneBounds(): BoundingBox | null {
    const scene: BoundingBox = {
      minX: Infinity,
      minY: Infinity,
      maxX: -Infinity,
      maxY: -Infinity,
    };

    this.forEach((entity) => {
      const bounds = entity.bounds.updateBounds();

      scene.minX = Math.min(scene.minX, bounds.minX);
      scene.minY = Math.min(scene.minY, bounds.minY);
      scene.maxX = Math.max(scene.maxX, bounds.maxX);
      scene.maxY = Math.max(scene.maxY, bounds.maxY);
    });

    return Number.isFinite(scene.minX) ? scene : null;
  }
}
