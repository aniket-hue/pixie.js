import type { Bounds, Interaction, Size, Style, Transform } from '../ecs/components/types';
import type { IRectangleConstructorData } from './types';

class Rectangle {
  transform: Transform;
  style: Style;
  size: Size;
  bounds: Bounds;
  interaction: Interaction;

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
  }: IRectangleConstructorData) {
    const center = { x, y };

    this.transform = {
      position: { x: center.x, y: center.y },
      rotation: angle,
      scale: { x: scaleX, y: scaleY },
    };

    this.style = {
      fill,
      stroke,
      strokeWidth,
    };

    this.size = {
      width,
      height,
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

    this.interaction = {
      draggable: true,
    };
  }
}

export default Rectangle;
