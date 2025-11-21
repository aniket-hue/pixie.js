import { BLACK_COLOR } from '../app/colors';
import { TextureComponent } from '../ecs/base/components/TextureComponent.class';
import type { Entity } from '../ecs/base/Entity.class';
import { m3 } from '../math/matrix';
import { TextureManager } from '../utils/TextureManager.class';
import { createBaseEntity } from './base';
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
}: ImageProps) {
  return (): Entity => {
    const image = createBaseEntity();

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

    // Load texture
    const textureManager = TextureManager.getInstance();
    try {
      textureManager.loadTexture(url).then((textureData) => {
        const actualWidth = width ?? textureData.width;
        const actualHeight = height ?? textureData.height;

        image.size.setWidth(actualWidth);
        image.size.setHeight(actualHeight);

        image.texture = new TextureComponent(textureData);
        image.dirty.markDirty();
      });
    } catch {
      image.size.setWidth(width ?? 100);
      image.size.setHeight(height ?? 100);

      image.texture = new TextureComponent({
        texture: null,
        image: null,
        url,
        width: width ?? 100,
        height: height ?? 100,
        loaded: false,
        uvX: 0,
        uvY: 0,
        uvWidth: 1,
        uvHeight: 1,
        bin: 0,
      });
    }

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
  };
}
