import type { Point } from '../../types';
import type { Canvas } from '../Canvas.class';
import type { Entity } from '../ecs/Entity.class';
import type { Picking } from '../webgl/Picking.class';
import type { SelectionState } from './SelectionState.class';

export class AddSelection {
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
      this.point = null;

      return;
    }

    this.point = point;
  }

  finish(): Entity[] {
    if (!this.point) {
      return [];
    }

    const entities = this.picker.pick({
      point: this.point,
      filter: (entity: Entity) => entity.interaction.selectable,
    });

    if (entities?.length) {
      this.selectionState.addToSelection(...entities);
    } else {
      this.selectionState.clearSelection();
    }

    return this.selectionState.selectedEntities;
  }
}
