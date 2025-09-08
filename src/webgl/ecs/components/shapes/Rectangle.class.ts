import { m3 } from '../../../math';
import type { Bounds, Interaction, Parent, Size, Style, Transform } from '../types';
import type { IRectangleConstructorData } from './types';

class Rectangle {
  transform: Transform;
  style: Style;
  size: Size;
  bounds: Bounds;
  interaction: Interaction;
  parent: Parent;
  entityId: number;

  constructor({
    x,
    y,
    width,
    height,
    fill = [0, 0, 0, 1],
    stroke = [0, 0, 0, 1],
    strokeWidth = 0,
    angle = 0,
    scaleX = 1,
    scaleY = 1,
    canvas,
  }: IRectangleConstructorData) {
    this.transform = {
      position: { x, y },
      rotation: angle,
      scale: { x: scaleX, y: scaleY },
    };

    this.style = { fill, stroke, strokeWidth };
    this.size = { width, height };

    // Build transformation matrix (without size)
    const translation = m3.translation(this.transform.position.x, this.transform.position.y);
    const scale = m3.scaling(this.transform.scale.x, this.transform.scale.y);
    const rotation = m3.rotation(this.transform.rotation);
    const matrix = m3.multiply(translation, m3.multiply(rotation, scale));

    const halfWidth = width * 0.5;
    const halfHeight = height * 0.5;

    const tl = m3.transformPoint(matrix, -halfWidth, -halfHeight);
    const tr = m3.transformPoint(matrix, halfWidth, -halfHeight);
    const bl = m3.transformPoint(matrix, -halfWidth, halfHeight);
    const br = m3.transformPoint(matrix, halfWidth, halfHeight);

    const minX = Math.min(tl.x, tr.x, bl.x, br.x);
    const minY = Math.min(tl.y, tr.y, bl.y, br.y);
    const maxX = Math.max(tl.x, tr.x, bl.x, br.x);
    const maxY = Math.max(tl.y, tr.y, bl.y, br.y);

    this.bounds = {
      matrix,
      bounds: { minX, minY, maxX, maxY },
    };

    this.interaction = {
      draggable: true,
    };

    this.parent = null;

    this.entityId = canvas.world.createEntity();
  }
}

export default Rectangle;
