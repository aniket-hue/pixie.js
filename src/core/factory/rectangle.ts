import { BLACK_COLOR } from '../app/colors';
import {
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
  setWidth,
  setWorldMatrix,
  Visibility,
  WorldMatrix,
} from '../ecs/components';
import { setVisible } from '../ecs/components/visible';
import type { World } from '../ecs/World.class';
import { m3 } from '../math/matrix';

export function createRectangle({
  x,
  y,
  width,
  height,
  visible,
  fill = BLACK_COLOR,
  stroke = BLACK_COLOR,
  strokeWidth = 0,
  scaleX = 1,
  scaleY = 1,
  angle = 0,
  draggable = true,
  selectable = true,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
} & Partial<{
  fill: number;
  stroke: number;
  strokeWidth: number;
  scaleX: number;
  scaleY: number;
  angle: number;
  visible: boolean;
  draggable: boolean;
  selectable: boolean;
}>) {
  return (world: World) => {
    const rect = world.addEntity();

    world.addComponent(LocalMatrix, rect);
    world.addComponent(Size, rect);
    world.addComponent(Interaction, rect);
    world.addComponent(Visibility, rect);
    world.addComponent(Bounds, rect);
    world.addComponent(Style, rect);
    world.addComponent(Parent, rect);
    world.addComponent(WorldMatrix, rect);

    const matrix = m3.compose({
      tx: x,
      ty: y,
      sx: scaleX,
      sy: scaleY,
      r: angle,
    });

    setLocalMatrix(rect, matrix);
    setWorldMatrix(rect, matrix);

    setWidth(rect, width);
    setHeight(rect, height);

    setFill(rect, fill);
    setStroke(rect, stroke);
    setStrokeWidth(rect, strokeWidth);

    setDraggable(rect, draggable);
    setSelectable(rect, selectable);

    markDirty(rect);

    if (visible !== undefined) {
      setVisible(rect, visible);
    }

    return rect;
  };
}
