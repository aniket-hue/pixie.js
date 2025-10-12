import { BLACK_COLOR } from '../app/colors';
import {
  markDirty,
  setDraggable,
  setFill,
  setHeight,
  setLocalMatrix,
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

    setLocalMatrix(image, matrix);
    setWorldMatrix(image, matrix);

    // Load texture
    const textureManager = TextureManager.getInstance();
    try {
      const textureData = await textureManager.loadTexture(url);

      // Use actual image dimensions if width/height not specified
      const actualWidth = width ?? textureData.width;
      const actualHeight = height ?? textureData.height;

      setWidth(image, actualWidth);
      setHeight(image, actualHeight);
      setTexture(image, textureData);
    } catch (error) {
      console.error('Failed to load image texture:', error);
      // Set default dimensions if texture loading fails
      setWidth(image, width ?? 100);
      setHeight(image, height ?? 100);
      // Set a placeholder texture data
      setTexture(image, {
        texture: null,
        image: null,
        url,
        width: width ?? 100,
        height: height ?? 100,
        loaded: false,
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
