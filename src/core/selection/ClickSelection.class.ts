import type { Point } from '../../types';
import type { Canvas } from '../Canvas.class';
import type { Entity } from '../ecs/base/Entity.class';
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
      filter: (entity: Entity) => entity.interaction.selectable,
    });

    if (!entities?.length) {
      this.point = null;
      this.selectionState.clearSelection();

      return;
    }

    this.point = point;
  }

  finish(): Entity[] {
    if (!this.point) {
      this.point = null;

      return [];
    }

    const entities = this.picker.pick({
      point: this.point,
      filter: (entity: Entity) => entity.interaction.selectable,
    });

    if (entities?.length) {
      this.selectionState.setSelectedEntities(entities);
    } else {
      this.selectionState.clearSelection();
    }

    this.point = null;

    return this.selectionState.selectedEntities;
  }
}
