import type { Component } from './components/lib';

export class World {
  entities: Set<number>;
  nextEntity: number;
  components: Map<Component, Set<number>>;

  constructor() {
    this.entities = new Set();
    this.nextEntity = 1;
    this.components = new Map();
  }

  addEntity() {
    const eid = this.nextEntity++;
    this.entities.add(eid);
    return eid;
  }

  removeEntity(eid: number) {
    this.entities.delete(eid);
    for (const comp of this.components.values()) {
      comp.delete(eid);
    }
  }

  addComponent(comp: Component, eid: number) {
    if (!this.components.has(comp)) {
      this.components.set(comp, new Set());
    }

    this.components.get(comp)!.add(eid);
  }

  removeComponent(comp: Component, eid: number) {
    this.components.get(comp)?.delete(eid);
  }

  query(comps: Component[]) {
    const sets = comps.map((c) => this.components.get(c) ?? new Set());
    return [...sets.reduce((a, b) => new Set([...a].filter((x) => b.has(x))))];
  }

  getEntities() {
    return this.entities;
  }
}
