export class World {
  private nextEntityId = 0;
  private entities = new Set<number>();

  private stores: Map<string, Map<number, any>> = new Map();
  private dirtyEntities = new Set<number>();

  createEntity(): number {
    const id = this.nextEntityId++;
    this.entities.add(id);
    return id;
  }

  addComponent<T>(type: string, entity: number, data: T) {
    if (!this.stores.has(type)) {
      this.stores.set(type, new Map());
    }

    this.stores.get(type)!.set(entity, data);
  }

  removeComponent<T>(type: string, entity: number) {
    this.stores.get(type)?.delete(entity);
  }

  getComponent<T>(type: string, entity: number): T | undefined {
    return this.stores.get(type)?.get(entity);
  }

  store<T>(type: string): Map<number, T> {
    return (this.stores.get(type) as Map<number, T>) ?? new Map();
  }

  removeEntity(entity: number) {
    this.entities.delete(entity);

    for (const store of this.stores.values()) {
      store.delete(entity);
    }

    this.dirtyEntities.delete(entity);
  }

  updateComponent<T>(type: string, entity: number, updates: Partial<T>) {
    const store = this.stores.get(type);

    if (store && store.has(entity)) {
      Object.assign(store.get(entity), updates);
      this.markDirty(entity);
    }
  }

  markDirty(entityId: number) {
    this.dirtyEntities.add(entityId);
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
