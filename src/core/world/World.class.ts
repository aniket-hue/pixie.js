import type { ComponentToData, ComponentType } from './types';

export class World {
  private nextEntityId = 0;
  private entities = new Set<number>();

  private stores: Map<ComponentType, Map<number, ComponentToData<any>>> = new Map();
  private dirtyEntities = new Set<number>();

  createEntity(): number {
    const id = this.nextEntityId++;
    this.entities.add(id);
    return id;
  }

  addComponent<T extends ComponentType>(type: T, entity: number, data: ComponentToData<T>) {
    if (!this.stores.has(type)) {
      this.stores.set(type, new Map());
    }

    this.stores.get(type)!.set(entity, data);
  }

  removeComponent(type: ComponentType, entity: number) {
    this.stores.get(type)?.delete(entity);
  }

  getComponent<T extends ComponentType>(type: T, entity: number): ComponentToData<T> | undefined {
    return this.stores.get(type)?.get(entity);
  }

  store<T extends ComponentType>(type: T): Map<number, ComponentToData<T>> {
    return (this.stores.get(type) as Map<number, ComponentToData<T>>) ?? new Map();
  }

  removeEntity(entity: number) {
    this.entities.delete(entity);

    for (const store of this.stores.values()) {
      store.delete(entity);
    }

    this.dirtyEntities.delete(entity);
  }

  updateComponent<T extends ComponentType>(type: T, entity: number, updates: Partial<ComponentToData<T>>) {
    const store = this.stores.get(type);
    const data = store?.get(entity);

    if (data) {
      Object.assign(data, updates);
      this.markDirty(entity);
    }
  }

  markDirty(entityId: number) {
    this.dirtyEntities.add(entityId);
  }

  removeDirty(entityId: number) {
    this.dirtyEntities.delete(entityId);
  }

  getEntities(): Set<number> {
    return this.entities;
  }

  getDirtyEntities(): Set<number> {
    return this.dirtyEntities;
  }

  clearDirty() {
    this.dirtyEntities.clear();
  }

  isDirty(entityId: number): boolean {
    return this.dirtyEntities.has(entityId);
  }
}
