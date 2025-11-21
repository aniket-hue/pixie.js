import { Entity } from '../ecs/base/Entity.class';

export function createBaseEntity(): Entity {
  const entity = new Entity();
  return entity;
}
