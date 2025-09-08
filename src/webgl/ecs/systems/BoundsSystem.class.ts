import { m3 } from '../../math';
import type { Bounds, Size, Transform } from '../components/types';
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

    const transform = transformStore.get(entity);
    const size = sizeStore.get(entity);
    const bounds = boundsStore.get(entity);

    if (!transform || !size || !bounds) return;

    const sx = size.width ? size.width : size.radius ? size.radius : 1;
    const sy = size.height ? size.height : size.radius ? size.radius : 1;

    const translation = m3.translation(transform.position.x, transform.position.y);
    const scale = m3.scaling(transform.scale.x * sx, transform.scale.y * sy);
    const rotation = m3.rotation(transform.rotation);
    const combined = m3.multiply(rotation, scale);
    const matrix = m3.multiply(translation, combined);

    bounds.matrix = matrix;
  }

  update() {
    const transformStore = this.world.store<Transform>('transform');

    for (const [entity] of transformStore.entries()) {
      this.updateEntity(entity);
    }
  }
}
