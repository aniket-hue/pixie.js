import type { Point } from '../../types';
import type { Canvas } from '../Canvas.class';
import { getSelectable } from '../ecs/components';
import type { Picking } from '../webgl/Picking.class';
import type { SelectionState } from './SelectionState.class';

export class ToggleSelection {
  private picker: Picking;
  private point: Point | null = null;
  private selectionState: SelectionState;

  constructor(canvas: Canvas, selectionState: SelectionState) {
    this.picker = canvas.picker;
    this.selectionState = selectionState;
  }

  start(_point: Point) {
    this.point = _point;
  }

  finish() {
    if (!this.point) {
      return this.selectionState.selectedEntities;
    }

    const entities = this.picker.pick({ point: this.point, filter: getSelectable });

    if (entities?.length) {
      this.selectionState.toggleSelection(...entities);
    } else {
      this.selectionState.clearSelection();
    }

    return this.selectionState.selectedEntities;
  }
}
