import type { Canvas } from '../Canvas.class';
import type { InteractionComponent, Size, Style, Transform } from '../ecs/components/types';
import { m3 } from '../math';
import type { ICircleConstructorData } from './types';

class Circle {
  // ECS entity reference
  entityId: number;

  constructor({ x, y, fill, radius, angle = 0, canvas }: ICircleConstructorData) {
    // Create ECS entity
    this.entityId = canvas.world.createEntity();
    const center = { x, y };

    const translation = m3.translation(center.x, center.y);
    const rotation = m3.rotation(angle);
    const scale = m3.scaling(radius, radius);
    const combined = m3.multiply(rotation, scale);
    const matrix = m3.multiply(translation, combined);

    const transformComponent: Transform = {
      position: { x: center.x, y: center.y },
      rotation: angle,
      scale: { x: 1, y: 1 },
      matrix,
    };

    const styleComponent: Style = {
      fill,
      stroke: [0, 0, 0, 1],
      strokeWidth: 0,
    };

    const sizeComponent: Size = {
      radius,
    };

    const interactionComponent: InteractionComponent = {
      draggable: true,
    };

    canvas.world.addComponent('transform', this.entityId, transformComponent);
    canvas.world.addComponent('style', this.entityId, styleComponent);
    canvas.world.addComponent('size', this.entityId, sizeComponent);
    canvas.world.addComponent('interaction', this.entityId, interactionComponent);
  }
}

export default Circle;
