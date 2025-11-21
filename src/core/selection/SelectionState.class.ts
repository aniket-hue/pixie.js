import type { Entity } from '../ecs/Entity.class';

export class SelectionState {
  selectedEntities: Entity[] = [];

  constructor() {
    this.selectedEntities = [];
  }

  setSelectedEntities(entities: Entity[]) {
    this.selectedEntities = entities;
  }

  addToSelection(...entities: Entity[]) {
    this.selectedEntities.push(...entities);
  }

  removeFromSelection(...entities: Entity[]) {
    this.selectedEntities = this.selectedEntities.filter((entity) => !entities.includes(entity));
  }

  clearSelection() {
    this.selectedEntities = [];
  }

  toggleSelection(...entities: Entity[]) {
    if (this.selectedEntities.some((entity) => entities.includes(entity))) {
      this.removeFromSelection(...entities);
    } else {
      this.addToSelection(...entities);
    }
  }
}
