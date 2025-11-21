import { Entity } from '../ecs/base/Entity.class';
import { createBoundingBoxOfchildren } from '../utils/createBoundingBoxOfchildren';

export function createSelectionGroup({ children }: { children: Entity[] }) {
  return (): Entity => {
    const newGroup = new Entity();

    const { width, height, localMatrix } = createBoundingBoxOfchildren(children);

    newGroup.matrix.setLocalMatrix(localMatrix);
    newGroup.matrix.setWorldMatrix();

    newGroup.size.setWidth(width);
    newGroup.size.setHeight(height);

    /**
     * We're not going to add styles components because we're not going to
     * render them on the scene canvas.
     */
    newGroup.interaction.setDraggable(true);
    newGroup.interaction.setSelectable(false);
    newGroup.visibility.setVisible(true);

    newGroup.dirty.markDirty();

    children.forEach((entity) => {
      newGroup.hierarchy.addChild(entity);
    });

    return newGroup;
  };
}
