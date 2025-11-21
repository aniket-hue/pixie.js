export class DirtyComponent {
  public dirty: boolean = false;

  markDirty(): void {
    this.dirty = true;
  }

  clearDirty(): void {
    this.dirty = false;
  }
}
