import { Object } from './entities/Object.class';
import type { ObjectFactory } from './entities/types';
import { World } from './World.class';

export class Scene {
  private world: World;
  private objects: Object[];

  constructor() {
    this.world = new World();
    this.objects = [];
  }

  add(objectFactory: ObjectFactory, renderContext: any): Object {
    const entityId = objectFactory.register(this.world);
    const objectInstance = new Object(renderContext, entityId);

    this.objects.push(objectInstance);
    this.world.markDirty(entityId);
    renderContext.requestRender();

    return objectInstance;
  }

  remove(object: Object, renderContext: any): void {
    if ((object as any).children) {
      (object as any).children.forEach((child: number) => {
        this.world.removeComponent('parent', child);
        this.world.markDirty(child);
      });
    }

    this.world.removeEntity(object.entityId);
    renderContext.requestRender();

    // Remove from objects array
    const index = this.objects.indexOf(object);
    if (index > -1) {
      this.objects.splice(index, 1);
    }
  }

  getObjects(): Object[] {
    return this.objects;
  }

  findObjectAtPoint(worldX: number, worldY: number): Object | null {
    for (const object of this.objects) {
      const transform = object.transformMatrix;
      const size = object.size;
      const isDraggable = object.isDraggable;

      if (!transform || !size || !isDraggable) {
        continue;
      }

      if (object.containsPoint(worldX, worldY)) {
        return object;
      }
    }

    return null;
  }

  getWorld(): World {
    return this.world;
  }

  destroy(): void {
    this.objects.length = 0;
    // World cleanup would go here if needed
  }
}
