import { BLACK_COLOR } from '../app/colors';
import { TextureComponent } from '../ecs/components/TextureComponent.class';
import type { Entity } from '../ecs/Entity.class';
import type { World } from '../ecs/World.class';
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
  return async (world: World): Promise<Entity> => {
    const image = createBaseEntity(world);

    const matrix = m3.compose({
      tx: x,
      ty: y,
      sx: scaleX,
      sy: scaleY,
      r: angle,
    });

    // setWorldMatrix will automatically set local matrix for root entities
    image.matrix.setWorldMatrix(matrix);

    // Load texture
    const textureManager = TextureManager.getInstance();
    try {
      const textureData = await textureManager.loadTexture(url);

      const actualWidth = width ?? textureData.width;
      const actualHeight = height ?? textureData.height;

      image.size.setWidth(actualWidth);
      image.size.setHeight(actualHeight);

      image.texture = new TextureComponent(textureData);
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
