import type { TextureData } from '../ecs/components/texture';
import { TextureAtlas } from '../lib/texture/TextureAtlas.class';

export class TextureManager {
  private static instance: TextureManager;
  private textures = new Map<string, TextureData>();
  private gl: WebGL2RenderingContext | null = null;
  public atlas: TextureAtlas;

  private constructor() {}

  static getInstance(): TextureManager {
    if (!TextureManager.instance) {
      TextureManager.instance = new TextureManager();
    }

    return TextureManager.instance;
  }

  setContext(gl: WebGL2RenderingContext): void {
    this.gl = gl;
    this.atlas = new TextureAtlas(gl);
  }

  async loadTexture(url: string): Promise<TextureData> {
    return new Promise((resolve, reject) => {
      requestIdleCallback(async () => {
        const existingTexture = this.textures.get(url);

        if (existingTexture?.loaded) {
          return existingTexture;
        }

        try {
          const image = new Image();
          image.crossOrigin = 'anonymous';

          const loadPromise = new Promise<HTMLImageElement>((resolve, reject) => {
            image.onload = () => resolve(image);
            image.onerror = reject;
          });

          image.src = url;
          const loadedImage = await loadPromise;

          const atlasEntry = this.atlas.addImage(url, loadedImage);

          this.textures.set(url, {
            ...atlasEntry,
            image: loadedImage,
            loaded: true,
            texture: atlasEntry.texture,
            url,
          });

          resolve(this.textures.get(url)!);
        } catch (error) {
          this.textures.delete(url);
          reject(new Error(`Failed to load texture from ${url}: ${error}`));
        }
      });
    });
  }

  getTexture(url: string): TextureData | undefined {
    return this.textures.get(url);
  }

  deleteTexture(url: string): void {
    const textureData = this.textures.get(url);
    if (textureData?.texture && this.gl) {
      this.gl.deleteTexture(textureData.texture);
    }
    this.textures.delete(url);
  }

  cleanup(): void {
    if (this.atlas) {
      this.atlas.cleanup();
      this.atlas = null;
    }

    this.textures.clear();
  }
}
