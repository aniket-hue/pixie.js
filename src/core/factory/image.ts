import { BLACK_COLOR } from '../app/colors';
import { Dirty } from '../ecs/base/components/DirtyComponent.class';
import { TextureComponent } from '../ecs/base/components/TextureComponent.class';
import { Entity } from '../ecs/base/Entity.class';
import { m3 } from '../lib/math';
import type { TextureManager } from '../webgl/TextureManager.class';
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
}: ImageProps, textureManager: TextureManager) {
  return (): { entity: Entity; promise: Promise<Entity> } => {
    const image = new Entity();

    const matrix = m3.compose({
      tx: x,
      ty: y,
      sx: scaleX,
      sy: scaleY,
      r: angle,
    });

    // For root entities, local matrix = world matrix
    image.matrix.setLocalMatrix(matrix);
    image.matrix.setWorldMatrix();

    image.size.setWidth(width ?? 100);
    image.size.setHeight(height ?? 100);

    const promise = textureManager.loadTexture(url).then((textureData) => {
      image.size.setWidth(width ?? textureData.width);
      image.size.setHeight(height ?? textureData.height);
      image.texture = new TextureComponent(image, textureData);
      image.dirty.markDirty(Dirty.TEXTURE);
      return image;
    });

    image.style.setFill(fill);
    image.style.setStroke(stroke);
    image.style.setStrokeWidth(strokeWidth);

    image.interaction.setDraggable(draggable);
    image.interaction.setSelectable(selectable);

    image.dirty.markDirty();

    if (visible !== undefined) {
      image.visibility.setVisible(visible);
    }

    return { entity: image, promise };
  };
}
