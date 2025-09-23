import { Bounds, Interaction, LocalMatrix, Parent, Size, Style, Visibility, WorldMatrix } from '../ecs/components';
import type { World } from '../ecs/World.class';

export function createBaseEntity(world: World) {
  const eid = world.addEntity();

  world.addComponent(LocalMatrix, eid);
  world.addComponent(WorldMatrix, eid);
  world.addComponent(Size, eid);
  world.addComponent(Bounds, eid);
  world.addComponent(Style, eid);
  world.addComponent(Parent, eid);
  world.addComponent(Interaction, eid);
  world.addComponent(Visibility, eid);

  return eid;
}
