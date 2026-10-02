import { BLACK_COLOR } from '../app/colors';
import { TextureComponent } from '../ecs/base/components/TextureComponent.class';
import { Entity } from '../ecs/base/Entity.class';
import { m3 } from '../lib/math';
import type { ImageProps } from './types';

export function createImage({
  x,
  y,
  width,
  height,
  url,
  visible,
  fill = 0x00000000, // Transparent by default to show texture
  stroke = BLACK_COLOR,
  strokeWidth = 0,
  scaleX = 1,
  scaleY = 1,
  angle = 0,
  draggable = true,
  selectable = true,
}: ImageProps): Entity {
  const image = new Entity();

  image.matrix.setLocalMatrix(m3.compose({ tx: x, ty: y, sx: scaleX, sy: scaleY, r: angle }));
  image.matrix.setWorldMatrix();

  // Placeholder size until the image loads.
  image.size.setWidth(width ?? height ?? 100);
  image.size.setHeight(height ?? width ?? 100);

  image.texture = new TextureComponent(image, { url, width: 0, height: 0, loaded: false }, { width, height });

  image.style.setFill(fill);
  image.style.setStroke(stroke);
  image.style.setStrokeWidth(strokeWidth);

  image.interaction.setDraggable(draggable);
  image.interaction.setSelectable(selectable);

  image.dirty.markDirty();

  if (visible !== undefined) {
    image.visibility.setVisible(visible);
  }

  return image;
}
