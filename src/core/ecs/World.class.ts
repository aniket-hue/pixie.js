import RBush from 'rbush';
import { setBounds } from './components';

interface TreeItem {
  id: number;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}
export class World {
  entities: Set<number>;
  nextEntity: number;
  components: Map<any, Set<number>>;

  tree: RBush<TreeItem>;
  treeMap: Map<number, TreeItem>;

  constructor() {
    this.entities = new Set();
    this.nextEntity = 1;
    this.components = new Map();
    this.tree = new RBush();
    this.treeMap = new Map();
  }

  addEntityFactory(factory: (world: World) => number) {
    const eid = factory(this);
    this.entities.add(eid);

    return eid;
  }

  addEntity() {
    const eid = this.nextEntity++;

    this.entities.add(eid);

    const bounds = setBounds(eid);

    if (bounds) {
      const newBounds = { id: eid, ...bounds };

      this.treeMap.set(eid, newBounds);
      this.tree.insert(newBounds);
    }

    return eid;
  }

  removeEntity(eid: number) {
    this.entities.delete(eid);

    const bounds = this.treeMap.get(eid);

    if (bounds) {
      this.tree.remove(bounds);
      this.treeMap.delete(eid);
    }

    for (const comp of this.components.values()) {
      comp.delete(eid);
    }
  }

  addComponent(comp: any, eid: number) {
    if (!this.components.has(comp)) {
      this.components.set(comp, new Set());
    }

    this.components.get(comp)!.add(eid);
  }

  removeComponent(comp: any, eid: number) {
    this.components.get(comp)?.delete(eid);
  }

  query(comps: any[]) {
    const sets = comps.map((c) => this.components.get(c) ?? new Set());
    return [...sets.reduce((a, b) => new Set([...a].filter((x) => b.has(x))))];
  }

  getEntities() {
    return this.entities;
  }

  hasComponent(comp: any, eid: number) {
    return this.components.has(comp) && this.components.get(comp)!.has(eid);
  }
}
