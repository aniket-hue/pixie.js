import { BLACK_COLOR } from '../app/colors';
import type { Entity } from '../ecs/Entity.class';
import type { World } from '../ecs/World.class';
import { m3 } from '../math/matrix';
import { createBaseEntity } from './base';
import type { RectangleProps } from './types';

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
  return (world: World): Entity => {
    const rect = createBaseEntity(world);

    const matrix = m3.compose({
      tx: x,
      ty: y,
      sx: scaleX,
      sy: scaleY,
      r: angle,
    });

    rect.matrix.setWorldMatrix(matrix);

    rect.size.setWidth(width);
    rect.size.setHeight(height);

    rect.style.setFill(fill);
    rect.style.setStroke(stroke);
    rect.style.setStrokeWidth(strokeWidth);

    rect.interaction.setDraggable(draggable);
    rect.interaction.setSelectable(selectable);

    rect.dirty.markDirty();

    if (visible !== undefined) {
      rect.visibility.setVisible(visible);
    }

    return rect;
  };
}
