import type { Canvas } from '../Canvas.class';
import type { InteractionComponent, Size, Style, Transform } from '../ecs/components/types';
import { m3 } from '../math';
import type { ICircleConstructorData } from './types';

class Circle {
  // ECS entity reference
  entityId: number;

  // Legacy properties for backward compatibility
  angle: number;
  color: [number, number, number, number];
  center: [number, number];
  radius: number;
  canvas: Canvas;
  transformationMatrix: number[];
  private vertices: Float32Array;

  constructor({ x, y, color, radius, angle = 0, canvas }: ICircleConstructorData) {
    this.canvas = canvas;

    // Create ECS entity
    this.entityId = canvas.world.createEntity();

    const center = { x, y };

    // Set legacy properties
    this.angle = angle;
    this.color = color;
    this.center = [center.x, center.y];
    this.radius = radius;

    // Calculate transformation matrix
    const translation = m3.translation(center.x, center.y);
    const rotation = m3.rotation(angle);
    const scale = m3.scaling(radius, radius);
    const combined = m3.multiply(rotation, scale);
    const matrix = m3.multiply(translation, combined);

    this.transformationMatrix = matrix;

    // Create ECS components
    const transformComponent: Transform = {
      position: { x: center.x, y: center.y },
      rotation: angle,
      scale: { x: 1, y: 1 }, // Circle uses uniform scaling via radius
      matrix,
    };

    const styleComponent: Style = {
      fill: color,
      stroke: [0, 0, 0, 1],
      strokeWidth: 0,
    };

    const sizeComponent: Size = {
      radius,
    };

    const interactionComponent: InteractionComponent = {
      draggable: true,
    };

    // Add components to ECS
    canvas.world.addComponent('transform', this.entityId, transformComponent);
    canvas.world.addComponent('style', this.entityId, styleComponent);
    canvas.world.addComponent('size', this.entityId, sizeComponent);
    canvas.world.addComponent('interaction', this.entityId, interactionComponent);

    // Create circle vertices (triangle fan)
    const segments = 32;
    this.vertices = new Float32Array((segments + 2) * 2);

    this.vertices[0] = 0;
    this.vertices[1] = 0;

    for (let i = 0; i <= segments; i++) {
      const circleAngle = (i * 2 * Math.PI) / segments;
      this.vertices[(i + 1) * 2] = Math.cos(circleAngle);
      this.vertices[(i + 1) * 2 + 1] = Math.sin(circleAngle);
    }
  }
}

export default Circle;
