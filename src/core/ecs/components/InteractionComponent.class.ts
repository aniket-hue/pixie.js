export class InteractionComponent {
  public draggable: boolean = false;
  public selectable: boolean = false;
  public selected: boolean = false;

  setDraggable(draggable: boolean): void {
    this.draggable = draggable;
  }

  setSelectable(selectable: boolean): void {
    this.selectable = selectable;
  }

  setSelected(selected: boolean): void {
    this.selected = selected;
  }
}
