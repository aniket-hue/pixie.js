import { SELECTION_BOX_BORDER_COLOR, SELECTION_BOX_FILL_COLOR } from '../app/colors';
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
  setLocalMatrix,
  setSelectable,
  setStroke,
  setStrokeWidth,
  setVisible,
  setWidth,
  setWorldMatrix,
  Visibility,
  WorldMatrix,
} from '../ecs/components';
import type { World } from '../ecs/World.class';

export function createSelectionGroup({ children }: { children: number[] }) {
  return (world: World) => {
    const newGroup = world.addEntity();

    setLocalMatrix(newGroup, [0, 0, 0, 0, 0, 0, 0, 0, 1]);
    setWorldMatrix(newGroup, [0, 0, 0, 0, 0, 0, 0, 0, 1]);

    setWidth(newGroup, 0);
    setHeight(newGroup, 0);

    setFill(newGroup, SELECTION_BOX_FILL_COLOR);
    setStrokeWidth(newGroup, 8);
    setStroke(newGroup, SELECTION_BOX_BORDER_COLOR);

    setDraggable(newGroup, true);
    setSelectable(newGroup, false);
    setVisible(newGroup, true);

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
      markDirty(entity);
    });

    return newGroup;
  };
}
