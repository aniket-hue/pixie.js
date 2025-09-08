import type { Bounds, Interaction, Size, Style, Transform } from '../types';
import type { ICircleConstructorData } from './types';

class Circle {
  // ECS entity reference
  entityId: number;
  transform: Transform;

  style: Style;
  size: Size;
  interaction: Interaction;
  bounds: Bounds;

  constructor({ x, y, fill, radius, angle = 0, canvas }: ICircleConstructorData) {
    this.entityId = canvas.world.createEntity();
    const center = { x, y };

    this.transform = {
      position: { x: center.x, y: center.y },
      rotation: angle,
      scale: { x: 1, y: 1 },
    };

    this.style = {
      fill,
      stroke: [0, 0, 0, 1],
      strokeWidth: 0,
    };

    this.size = {
      radius,
    };

    this.interaction = {
      draggable: true,
    };

    this.bounds = {
      matrix: [],
      bounds: {
        minX: 0,
        minY: 0,
        maxX: 0,
        maxY: 0,
      },
    };
  }
}

export default Circle;
