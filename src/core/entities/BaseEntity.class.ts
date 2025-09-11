import type { Canvas } from '../Canvas.class';
import { m3 } from '../math';
import { computeBoundsOfMatrix } from '../utils/computeBoundsOfMatrix';
import type { Size, Style, Transform } from '../world/types';

export class BaseEntity {
  canvas: Canvas;
  entityId: number;

  constructor(canvas: Canvas, entityId: number) {
    this.canvas = canvas;
    this.entityId = entityId;
  }

  get transform() {
    const transform = this.canvas.world.getComponent('transform', this.entityId);

    if (!transform) {
      console.error('Transform not found');

      return { localMatrix: m3.identity(), worldMatrix: m3.identity() };
    }

    return transform;
  }

  set transform(transform: Transform) {
    this.canvas.world.updateComponent('transform', this.entityId, transform);
  }

  get size() {
    const size = this.canvas.world.getComponent('size', this.entityId);

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
    const matrix = this.transform.localMatrix;
    return matrix[3];
  }

  set rotation(angle: number) {
    const matrix = this.transform.localMatrix;
    matrix[3] = angle;
    matrix[4] = angle;

    this.transform.localMatrix = matrix;
  }

  set scaleX(scale: number) {
    const matrix = this.transform.localMatrix;
    matrix[0] = scale;

    this.transform.localMatrix = matrix;
  }

  get scaleX() {
    const matrix = this.transform.localMatrix;
    return matrix[0];
  }

  set scaleY(scale: number) {
    const matrix = this.transform.localMatrix;
    matrix[4] = scale;

    this.transform.localMatrix = matrix;
  }

  get x() {
    const matrix = this.transform.localMatrix;

    return matrix[6];
  }

  get y() {
    const matrix = this.transform.localMatrix;

    return matrix[7];
  }

  set x(x: number) {
    const matrix = this.transform.localMatrix;
    matrix[6] = x;

    this.transform.localMatrix = matrix;
  }

  set y(y: number) {
    const matrix = this.transform.localMatrix;
    matrix[7] = y;

    this.transform.localMatrix = matrix;
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
    const interaction = this.canvas.world.getComponent('interaction', this.entityId);

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

  get isSelectable() {
    const interaction = this.interaction;

    return interaction?.selectable;
  }

  set selectable(selected: boolean) {
    const interaction = this.interaction;

    this.canvas.world.updateComponent('interaction', this.entityId, { ...interaction, selectable: selected });
  }

  get selected() {
    const interaction = this.interaction;

    return interaction?.selected ?? false;
  }

  set selected(selected: boolean) {
    const interaction = this.interaction;

    this.canvas.world.updateComponent('interaction', this.entityId, { ...interaction, selected });
  }

  get style(): Style {
    const style = this.canvas.world.getComponent('style', this.entityId);

    if (!style) {
      console.error('Style not found');

      return { fill: [0, 0, 0, 1], stroke: [0, 0, 0, 1], strokeWidth: 0 };
    }

    return style;
  }

  get bounds() {
    const m = this.transform.worldMatrix;
    const size = this.size;

    const w = 'width' in size ? size.width! : size.radius! * 2;
    const h = 'height' in size ? size.height! : size.radius! * 2;

    return computeBoundsOfMatrix({
      matrix: m,
      size: {
        width: w,
        height: h,
      },
    });
  }

  get children() {
    const children = this.canvas.world.getComponent('children', this.entityId);

    return children;
  }

  get dirty() {
    return this.canvas.world.isDirty(this.entityId);
  }

  containsPoint(worldX: number, worldY: number) {
    const matrix = this.transform.worldMatrix;
    const size = this.size;

    const inMatrix = m3.inverse(matrix);
    const localPoint = m3.transformPoint(inMatrix, worldX, worldY);

    const halfWidth = 'radius' in size ? size.radius! : size.width! * 0.5;
    const halfHeight = 'radius' in size ? size.radius! : size.height! * 0.5;

    return localPoint.x >= -halfWidth && localPoint.x <= halfWidth && localPoint.y >= -halfHeight && localPoint.y <= halfHeight;
  }
}
