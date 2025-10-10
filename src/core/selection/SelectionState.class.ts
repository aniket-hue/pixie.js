export class SelectionState {
  selectedEntities: number[] = [];

  constructor() {
    this.selectedEntities = [];
  }

  setSelectedEntities(entities: number[]) {
    this.selectedEntities = entities;
  }

  addToSelection(...entities: number[]) {
    this.selectedEntities.push(...entities);
  }

  removeFromSelection(...entities: number[]) {
    this.selectedEntities = this.selectedEntities.filter((eid) => !entities.includes(eid));
  }

  clearSelection() {
    this.selectedEntities = [];
  }

  toggleSelection(...entities: number[]) {
    if (this.selectedEntities.some((eid) => entities.includes(eid))) {
      this.removeFromSelection(...entities);
    } else {
      this.addToSelection(...entities);
    }
  }
}
