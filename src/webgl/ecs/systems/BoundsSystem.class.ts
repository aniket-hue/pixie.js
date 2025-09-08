import { identityMatrix, m3 } from '../../math';
import type { Bounds, Children, Parent, Size, Transform } from '../components/types';
import type { World } from '../World.class';

export class BoundsSystem {
  private world: World;

  constructor(world: World) {
    this.world = world;
    this.update();
  }

  updateEntity(entity: number) {
    const transformStore = this.world.store<Transform>('transform');
    const sizeStore = this.world.store<Size>('size');
    const boundsStore = this.world.store<Bounds>('bounds');
    const parentStore = this.world.store<Parent>('parent');
    const childrenStore = this.world.store<Children>('children');

    const parent = parentStore.get(entity);
    const transform = transformStore.get(entity);
    const size = sizeStore.get(entity);
    const bounds = boundsStore.get(entity);

    if (!transform || !bounds || !size) return;

    let parentWorldMatrix = identityMatrix;

    if (parent) {
      const parentBounds = boundsStore.get(parent);
      if (parentBounds) {
        parentWorldMatrix = parentBounds.matrix;
      }
    }

    const translation = m3.translation(transform.position.x, transform.position.y);
    const rotation = m3.rotation(transform.rotation);
    const scale = m3.scaling(transform.scale.x, transform.scale.y);

    const localMatrix = m3.multiply(translation, m3.multiply(rotation, scale));

    bounds.matrix = m3.multiply(parentWorldMatrix, localMatrix);

    const width = size.width || (size.radius ? size.radius * 2 : 1);
    const height = size.height || (size.radius ? size.radius * 2 : 1);

    const halfWidth = width * 0.5;
    const halfHeight = height * 0.5;

    const tl = m3.transformPoint(bounds.matrix, -halfWidth, -halfHeight);
    const tr = m3.transformPoint(bounds.matrix, halfWidth, -halfHeight);
    const bl = m3.transformPoint(bounds.matrix, -halfWidth, halfHeight);
    const br = m3.transformPoint(bounds.matrix, halfWidth, halfHeight);

    const minX = Math.min(tl.x, tr.x, bl.x, br.x);
    const minY = Math.min(tl.y, tr.y, bl.y, br.y);
    const maxX = Math.max(tl.x, tr.x, bl.x, br.x);
    const maxY = Math.max(tl.y, tr.y, bl.y, br.y);

    bounds.bounds = { minX, minY, maxX, maxY };

    const children = childrenStore.get(entity);

    if (children) {
      for (const childId of children) {
        this.updateEntity(childId);
      }
    }
  }

  update() {
    const transformStore = this.world.store<Transform>('transform');
    const parentStore = this.world.store<Parent>('parent');

    // Only start updates from root entities (entities without parents)
    // The updateEntity method will recursively handle all children
    for (const [entity] of transformStore.entries()) {
      const parent = parentStore.get(entity);
      if (!parent) {
        this.updateEntity(entity);
      }
    }
  }
}
