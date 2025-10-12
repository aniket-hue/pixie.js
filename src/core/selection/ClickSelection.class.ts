import type { Point } from '../../types';
import type { Canvas } from '../Canvas.class';
import { getSelectable } from '../ecs/components';
import type { Picking } from '../webgl/Picking.class';
import type { SelectionState } from './SelectionState.class';

export class ClickSelection {
  private picker: Picking;
  private point: Point | null = null;
  private selectionState: SelectionState;

  constructor(canvas: Canvas, selectionState: SelectionState) {
    this.picker = canvas.picker;
    this.selectionState = selectionState;
  }

  start(point: Point) {
    const entities = this.picker.pick({
      point,
    });

    if (!entities?.length) {
      this.selectionState.clearSelection();

      return;
    }

    this.point = point;
  }

  finish() {
    if (!this.point) {
      return [];
    }

    const entities = this.picker.pick({ point: this.point, filter: getSelectable });

    if (entities?.length) {
      this.selectionState.setSelectedEntities(entities);
    } else {
      this.selectionState.clearSelection();
    }

    return this.selectionState.selectedEntities;
  }
}
