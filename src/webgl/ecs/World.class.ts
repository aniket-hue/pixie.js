export class World {
  private nextEntityId = 0;
  private entities = new Set<number>();

  private stores: Map<string, Map<number, any>> = new Map();

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
  }
}
