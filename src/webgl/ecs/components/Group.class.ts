import type { Canvas } from '../../Canvas.class';
import { m3 } from '../../math';
import type { Bounds, Children, Interaction, Parent, Size, Style, Transform } from './types';

export class Group {
  transform: Transform;
  bounds: Bounds;
  style: Style;
  size: Size;
  canvas: Canvas;
  children: Children;
  entityId: number;
  interaction: Interaction;
  parent: Parent;

  constructor(objects: number[], canvas: Canvas) {
    this.canvas = canvas;
    this.entityId = canvas.world.createEntity();
    const boundsStore = canvas.world.store<Bounds>('bounds');

    if (!boundsStore) {
      throw new Error('Bounds store not found');
    }

    const minX =
      objects.reduce((acc, object) => {
        const bounds = boundsStore.get(object);
        if (!bounds) {
          return acc;
        }

        return Math.min(acc, bounds.bounds.minX);
      }, Infinity) ?? 0;

    const minY =
      objects.reduce((acc, object) => {
        const bounds = boundsStore.get(object);
        if (!bounds) {
          return acc;
        }

        return Math.min(acc, bounds.bounds.minY);
      }, Infinity) ?? 0;

    const maxX =
      objects.reduce((acc, object) => {
        const bounds = boundsStore.get(object);
        if (!bounds) {
          return acc;
        }

        return Math.max(acc, bounds.bounds.maxX);
      }, -Infinity) ?? 0;

    const maxY =
      objects.reduce((acc, object) => {
        const bounds = boundsStore.get(object);
        if (!bounds) {
          return acc;
        }

        return Math.max(acc, bounds.bounds.maxY);
      }, -Infinity) ?? 0;

    const centerX = (maxX + minX) / 2;
    const centerY = (maxY + minY) / 2;

    this.transform = {
      position: { x: centerX, y: centerY },
      rotation: 0,
      scale: { x: 1, y: 1 },
    };

    const translation = m3.translation(this.transform.position.x, this.transform.position.y);
    const scale = m3.scaling(this.transform.scale.x, this.transform.scale.y);
    const rotation = m3.rotation(this.transform.rotation);
    const combined = m3.multiply(rotation, scale);
    const matrix = m3.multiply(translation, combined);

    this.bounds = {
      matrix,
      bounds: {
        minX,
        minY,
        maxX,
        maxY,
      },
    };

    this.style = {
      fill: [0, 0, 0, 0.5],
      stroke: [0, 0, 0, 1],
      strokeWidth: 0,
    };

    this.size = {
      width: maxX - minX,
      height: maxY - minY,
    };

    this.interaction = {
      draggable: true,
    };

    this.children = objects;
    this.parent = null;
  }
}
