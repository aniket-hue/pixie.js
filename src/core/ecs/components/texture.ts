export interface TextureData {
  texture: WebGLTexture | null;
  image: HTMLImageElement | null;
  url: string;
  width: number;
  height: number;
  loaded: boolean;
}

// Use a Map to store texture data since it's complex objects
const textureStore = new Map<number, TextureData>();

export const getTexture = (eid: number): TextureData | undefined => {
  return textureStore.get(eid);
};

export const setTexture = (eid: number, textureData: TextureData): void => {
  textureStore.set(eid, textureData);
};

export const hasTexture = (eid: number): boolean => {
  return textureStore.has(eid);
};

export const removeTexture = (eid: number): void => {
  textureStore.delete(eid);
};
