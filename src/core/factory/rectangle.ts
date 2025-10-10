import { BLACK_COLOR } from "../app/colors";
import {
  markDirty,
  setDraggable,
  setFill,
  setHeight,
  setLocalMatrix,
  setSelectable,
  setStroke,
  setStrokeWidth,
  setWidth,
  setWorldMatrix,
} from "../ecs/components";
import { setVisible } from "../ecs/components/visible";
import type { World } from "../ecs/World.class";
import { m3 } from "../math/matrix";
import { createBaseEntity } from "./base";
import type { RectangleProps } from "./types";

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
}: RectangleProps) {
  return (world: World) => {
    const rect = createBaseEntity(world);

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
