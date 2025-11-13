import { convertHelper, SELECTION_BOX_FILL_COLOR } from '../app/colors';
import {
  addChild,
  Bounds,
  Interaction,
  LocalMatrix,
  markDirty,
  Parent,
  Size,
  Style,
  setDraggable,
  setFill,
  setHeight,
  setLocalMatrixDirect,
  setSelectable,
  setVisible,
  setWidth,
  setWorldMatrixDirect,
  Visibility,
  WorldMatrix,
} from '../ecs/components';
import type { World } from '../ecs/World.class';

export function createSelectionGroup({ children }: { children: number[] }) {
  return (world: World) => {
    const newGroup = world.addEntity();

    const identity = [1, 0, 0, 0, 1, 0, 0, 0, 1];
    setLocalMatrixDirect(newGroup, identity);
    setWorldMatrixDirect(newGroup, identity);

    setWidth(newGroup, 0);
    setHeight(newGroup, 0);

    /**
     * We're not going to add styles components because we're not going to
     * render them on the scene canvas.
     */
    setDraggable(newGroup, true);
    setSelectable(newGroup, false);
    setVisible(newGroup, true);

    setFill(newGroup, convertHelper(SELECTION_BOX_FILL_COLOR));

    world.addComponent(LocalMatrix, newGroup);
    world.addComponent(Size, newGroup);
    world.addComponent(Interaction, newGroup);
    world.addComponent(Visibility, newGroup);
    world.addComponent(Bounds, newGroup);
    world.addComponent(Style, newGroup);
    world.addComponent(Parent, newGroup);
    world.addComponent(WorldMatrix, newGroup);

    markDirty(newGroup);

    children.forEach((entity) => {
      addChild(newGroup, entity);
    });

    return newGroup;
  };
}
