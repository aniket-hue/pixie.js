import type { Canvas } from '../Canvas.class';
import { Geometric, Interactable, Sizable, Styleable, Transformable } from '../mixins';
import type { World } from '../world/World.class';

// Base class that implements MixinBase interface
class BaseEntityCore {
  canvas: Canvas;
  entityId: number;
  world: World;

  constructor(canvas: Canvas, entityId: number) {
    this.canvas = canvas;
    this.entityId = entityId;
    this.world = canvas.world;
  }

  // Utility methods that don't belong to specific mixins
  get children() {
    const children = this.canvas.world.getComponent('children', this.entityId);
    return children;
  }

  get dirty() {
    return this.canvas.world.isDirty(this.entityId);
  }
}

// Compose BaseEntity using all mixins
export const BaseEntity = Geometric(Styleable(Interactable(Sizable(Transformable(BaseEntityCore)))));
