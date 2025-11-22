import { Entity } from '../ecs/base/Entity.class';

export function createGroup() {
  return (): Entity => {
    const rect = new Entity();

    rect.size.setWidth(5000);
    rect.size.setHeight(5000);

    rect.interaction.setDraggable(true);
    rect.interaction.setSelectable(true);
    rect.visibility.setVisible(true);

    rect.dirty.markDirty();

    return rect;
  };
}
