import type { Canvas } from '../Canvas.class';
import type { Children, Interaction, Size, Style, Transform } from '../factory/types';
import { m3 } from '../math';

export class BaseEntity {
  canvas: Canvas;
  entityId: number;

  constructor(canvas: Canvas, entityId: number) {
    this.canvas = canvas;
    this.entityId = entityId;
  }

  get transform() {
    const transform = this.canvas.world.getComponent<Transform>('transform', this.entityId);

    if (!transform) {
      console.error('Transform not found');

      return { matrix: m3.identity() };
    }

    return transform;
  }

  set transform(transform: Transform) {
    this.canvas.world.updateComponent('transform', this.entityId, transform);
  }

  set transformMatrix(matrix: number[]) {
    this.canvas.world.updateComponent('transform', this.entityId, { matrix });
  }

  get transformMatrix() {
    const transform = this.transform;

    if (!transform) {
      console.error('Transform not found');

      return m3.identity();
    }

    return transform.matrix;
  }

  get size() {
    const size = this.canvas.world.getComponent<Size>('size', this.entityId);

    if (!size) {
      console.error('Size not found');

      return { width: 0, height: 0 };
    }

    return size;
  }

  set size(size: Size) {
    this.canvas.world.updateComponent('size', this.entityId, size);
  }

  get rotation() {
    const matrix = this.transformMatrix;
    return matrix[3];
  }

  set rotation(angle: number) {
    const matrix = this.transformMatrix;
    matrix[3] = angle;
    matrix[4] = angle;

    this.transform = { matrix };
  }

  set scaleX(scale: number) {
    const matrix = this.transformMatrix;
    matrix[0] = scale;

    this.transform = { matrix };
  }

  get scaleX() {
    const matrix = this.transformMatrix;
    return matrix[0];
  }

  set scaleY(scale: number) {
    const matrix = this.transformMatrix;
    matrix[4] = scale;

    this.transform = { matrix };
  }

  get x() {
    const matrix = this.transformMatrix;

    return matrix[6];
  }

  get y() {
    const matrix = this.transformMatrix;

    return matrix[7];
  }

  set x(x: number) {
    const oldX = this.x;
    const deltaX = x - oldX;

    const children = this.canvas.world.getComponent<Children>('children', this.entityId);
    const matrix = this.transformMatrix;
    matrix[6] = x;

    if (children) {
      children.forEach((child) => {
        child.x = child.x + deltaX;
        this.canvas.world.markDirty(child.entityId);
      });
    }

    this.transform = { matrix };
  }

  set y(y: number) {
    const oldY = this.y;
    const deltaY = y - oldY;

    const children = this.canvas.world.getComponent<Children>('children', this.entityId);
    const matrix = this.transformMatrix;
    matrix[7] = y;

    if (children) {
      children.forEach((child) => {
        child.y = child.y + deltaY;
        this.canvas.world.markDirty(child.entityId);
      });
    }

    this.transform = { matrix };
  }

  get width() {
    const size = this.size;

    return size.width;
  }

  get height() {
    const size = this.size;

    return size.height;
  }

  get interaction() {
    const interaction = this.canvas.world.getComponent<Interaction>('interaction', this.entityId);

    if (!interaction) {
      console.error('Interaction not found');

      return { draggable: false, selectable: false };
    }

    return interaction;
  }

  get isDraggable() {
    const interaction = this.interaction;

    return interaction?.draggable;
  }

  get style(): Style {
    const style = this.canvas.world.getComponent<Style>('style', this.entityId);

    if (!style) {
      console.error('Style not found');

      return { fill: [0, 0, 0, 1], stroke: [0, 0, 0, 1], strokeWidth: 0 };
    }

    return style;
  }

  get bounds() {
    const transform = this.transformMatrix;
    const size = this.size;

    const w = 'width' in size ? size.width! : size.radius! * 2;
    const h = 'height' in size ? size.height! : size.radius! * 2;

    return {
      minX: transform[6] - w / 2,
      minY: transform[7] - h / 2,
      maxX: transform[6] + w / 2,
      maxY: transform[7] + h / 2,
    };
  }
}
