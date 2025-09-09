import type { Canvas } from '../Canvas.class';
import { BaseEntity } from './BaseEntity.class';

export class Object extends BaseEntity {
  constructor(canvas: Canvas, entityId: number) {
    super(canvas, entityId);
  }
}
