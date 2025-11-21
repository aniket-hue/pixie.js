import { Entity } from '../ecs/Entity.class';
import type { World } from '../ecs/World.class';

export function createBaseEntity(world: World): Entity {
  const entity = new Entity();
  world.addEntity(entity);
  return entity;
}
