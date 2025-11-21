import { convertHelper, SELECTION_BOX_FILL_COLOR } from '../app/colors';
import type { Entity } from '../ecs/Entity.class';
import type { World } from '../ecs/World.class';
import { createBaseEntity } from './base';

export function createSelectionGroup({ children }: { children: Entity[] }) {
  return (world: World): Entity => {
    const newGroup = createBaseEntity(world);

    const identity = [1, 0, 0, 0, 1, 0, 0, 0, 1];
    newGroup.matrix.setLocalMatrixDirect(identity);
    newGroup.matrix.setWorldMatrixDirect(identity);

    newGroup.size.setWidth(0);
    newGroup.size.setHeight(0);

    /**
     * We're not going to add styles components because we're not going to
     * render them on the scene canvas.
     */
    newGroup.interaction.setDraggable(true);
    newGroup.interaction.setSelectable(false);
    newGroup.visibility.setVisible(true);

    newGroup.style.setFill(convertHelper(SELECTION_BOX_FILL_COLOR));

    newGroup.dirty.markDirty();

    children.forEach((entity) => {
      newGroup.hierarchy.addChild(entity);
    });

    return newGroup;
  };
}
