import type { Canvas } from '../Canvas.class';
import { Children, Geometric, Group, Interactable, Parent, Sizable, Styleable, Transformable, Visiblity } from '../mixins';
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

  get dirty() {
    return this.canvas.world.isDirty(this.entityId);
  }
}

// Compose BaseEntity using all mixins
export const BaseEntity = Geometric(Styleable(Interactable(Sizable(Transformable(Children(Parent(Visiblity(Group(BaseEntityCore)))))))));
