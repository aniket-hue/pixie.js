import { BLACK_COLOR } from '../app/colors';
import {
  markDirty,
  setDraggable,
  setFill,
  setHeight,
  setSelectable,
  setStroke,
  setStrokeWidth,
  setTexture,
  setWidth,
  setWorldMatrix,
} from '../ecs/components';
import { setVisible } from '../ecs/components/visible';
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
  return async (world: World) => {
    const image = createBaseEntity(world);

    const matrix = m3.compose({
      tx: x,
      ty: y,
      sx: scaleX,
      sy: scaleY,
      r: angle,
    });

    // setWorldMatrix will automatically set local matrix for root entities
    setWorldMatrix(image, matrix);

    // Load texture
    const textureManager = TextureManager.getInstance();
    try {
      const textureData = await textureManager.loadTexture(url);

      const actualWidth = width ?? textureData.width;
      const actualHeight = height ?? textureData.height;

      setWidth(image, actualWidth);
      setHeight(image, actualHeight);

      setTexture(image, textureData);
    } catch {
      setWidth(image, width ?? 100);
      setHeight(image, height ?? 100);

      setTexture(image, {
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

    setFill(image, fill);
    setStroke(image, stroke);
    setStrokeWidth(image, strokeWidth);

    setDraggable(image, draggable);
    setSelectable(image, selectable);

    markDirty(image);

    if (visible !== undefined) {
      setVisible(image, visible);
    }

    return image;
  };
}
