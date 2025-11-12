import type { TextureData } from '../ecs/components/texture';
import { TextureAtlas } from '../lib/texture/TextureAtlas.class';

export class TextureManager {
  private static instance: TextureManager;
  private textures = new Map<string, TextureData>();
  private gl: WebGL2RenderingContext | null = null;
  private atlas: TextureAtlas | null = null;

  private constructor() {}

  static getInstance(): TextureManager {
    if (!TextureManager.instance) {
      TextureManager.instance = new TextureManager();
    }

    return TextureManager.instance;
  }

  initialize(gl: WebGL2RenderingContext): void {
    if (this.gl === gl && this.atlas) {
      return;
    }

    this.gl = gl;
    this.atlas = new TextureAtlas(gl);
  }

  private ensureInitialized(): void {
    if (!this.gl || !this.atlas) {
      throw new Error('TextureManager must be initialized with WebGL context before use');
    }
  }

  async loadTexture(url: string): Promise<TextureData> {
    this.ensureInitialized();

    // Check if texture is already loaded
    const existingTexture = this.textures.get(url);
    if (existingTexture?.loaded) {
      return existingTexture;
    }

    try {
      // Load image
      const image = await this.loadImage(url);

      // Add to atlas (atlas is guaranteed to exist after ensureInitialized)
      if (!this.atlas) {
        throw new Error('Atlas not initialized');
      }
      const atlasEntry = this.atlas.addImage(url, image);

      // Create texture data
      const textureData: TextureData = {
        ...atlasEntry,
        image,
        loaded: true,
        texture: atlasEntry.texture,
        url,
      };

      this.textures.set(url, textureData);
      return textureData;
    } catch (error) {
      // Store failed state to prevent retry loops
      this.textures.set(url, {
        texture: null,
        image: null,
        url,
        width: 0,
        height: 0,
        loaded: false,
        uvX: 0,
        uvY: 0,
        uvWidth: 1,
        uvHeight: 1,
        bin: 0,
      });
      throw new Error(`Failed to load texture from ${url}: ${error}`);
    }
  }

  private loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = 'anonymous';

      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`Failed to load image: ${url}`));

      image.src = url;
    });
  }

  getTexture(url: string): TextureData | undefined {
    return this.textures.get(url);
  }

  getAtlasTexture(bin: number): WebGLTexture | null {
    this.ensureInitialized();

    if (!this.atlas) {
      return null;
    }

    return this.atlas.getTexture(bin);
  }

  deleteTexture(url: string): void {
    const textureData = this.textures.get(url);
    if (textureData?.texture && this.gl) {
      this.gl.deleteTexture(textureData.texture);
    }
    this.textures.delete(url);
  }

  flushAtlasUpdates(): void {
    if (this.atlas) {
      this.atlas.flushUpdates();
    }
  }

  cleanup(): void {
    if (this.atlas) {
      this.atlas.cleanup();
      this.atlas = null;
    }

    this.textures.clear();
    this.gl = null;
  }
}
