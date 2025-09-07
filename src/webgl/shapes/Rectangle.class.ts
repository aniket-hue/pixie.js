import type { InteractionComponent, Size, Style, Transform } from '../ecs/components/types';
import { m3 } from '../math';
import type { IRectangleConstructorData } from './types';

class Rectangle {
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
    this.entityId = canvas.world.createEntity();
    const center = { x, y };

    const translation = m3.translation(center.x, center.y);
    const scale = m3.scaling(scaleX * width, scaleY * height);
    const rotation = m3.rotation(angle);
    const combined = m3.multiply(rotation, scale);
    const matrix = m3.multiply(translation, combined);

    const transformComponent: Transform = {
      position: { x: center.x, y: center.y },
      rotation: angle,
      scale: { x: scaleX, y: scaleY },
      matrix,
    };

    const styleComponent: Style = {
      fill,
      stroke,
      strokeWidth,
    };

    const sizeComponent: Size = {
      width,
      height,
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

export default Rectangle;
