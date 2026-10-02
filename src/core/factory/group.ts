import { Entity } from '../ecs/base/Entity.class';
import { createBoundingBoxOfchildren } from '../utils/createBoundingBoxOfchildren';

export function createGroup(children: Entity[]): Entity {
  const group = new Entity();

  const { width, height, localMatrix } = createBoundingBoxOfchildren(children);

  group.matrix.setLocalMatrix(localMatrix);
  group.matrix.setWorldMatrix();

  group.size.setWidth(width);
  group.size.setHeight(height);

  group.interaction.setDraggable(true);
  group.interaction.setSelectable(true);

  group.dirty.markDirty();

  for (const child of children) {
    group.hierarchy.addChild(child);
  }

  return group;
}
