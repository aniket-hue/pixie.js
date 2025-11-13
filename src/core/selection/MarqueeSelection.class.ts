import type { BoundingBox, Point } from '../../types';
import type { Canvas } from '../Canvas.class';
import { getSelectable } from '../ecs/components';
import { m3 } from '../math';
import { getBoundingBoxFrom2Points } from '../utils/getBoundingBoxFrom2Points';
import type { Picking } from '../webgl/Picking.class';
import type { SelectionState } from './SelectionState.class';

export class MarqueeSelection {
  marquee: number[] | null = null;
  private boundingBox: BoundingBox | null = null;

  private canvas: Canvas;
  private picker: Picking;
  private startPoint: Point | null = null;
  private selectionState: SelectionState;
  constructor(canvas: Canvas, selectionState: SelectionState) {
    this.picker = canvas.picker;
    this.canvas = canvas;
    this.selectionState = selectionState;
  }

  start(point: Point) {
    this.selectionState.clearSelection();

    const entities = this.picker.pick({
      boundingBox: { minX: point.x, minY: point.y, maxX: point.x, maxY: point.y },
    });

    if (entities?.length) {
      this.canvas.requestRender();

      return;
    }

    this.startPoint = point;

    this.marquee = m3.compose({
      tx: point.x,
      ty: point.y,
      sx: 1,
      sy: 1,
      r: 0,
    });

    this.canvas.requestRender();
  }

  update(point: Point) {
    if (!this.startPoint) {
      return;
    }

    const boundingBox = getBoundingBoxFrom2Points(this.startPoint, point);

    this.marquee = m3.compose({
      tx: boundingBox.centerX,
      ty: boundingBox.centerY,
      sx: boundingBox.width,
      sy: boundingBox.height,
      r: 0,
    });

    this.boundingBox = {
      minX: boundingBox.minX,
      minY: boundingBox.minY,
      maxX: boundingBox.maxX,
      maxY: boundingBox.maxY,
    };

    const entities = this.picker.pick({
      boundingBox: this.boundingBox,
      filter: getSelectable,
    });

    if (!entities?.length) {
      this.canvas.requestRender();

      return;
    }
  }

  finish() {
    if (!this.marquee || !this.boundingBox) {
      return [];
    }

    const entities = this.picker.pick({
      boundingBox: this.boundingBox,
      filter: getSelectable,
    });

    if (entities?.length) {
      this.selectionState.addToSelection(...entities);
    } else {
      this.selectionState.clearSelection();
    }

    return this.selectionState.selectedEntities;
  }

  cleanup() {
    this.canvas.requestRender();
  }
}
