import type { TextureData } from '../ecs/components/texture';

export class TextureManager {
  private static instance: TextureManager;
  private textures = new Map<string, TextureData>();
  private gl: WebGL2RenderingContext | null = null;

  private constructor() {}

  static getInstance(): TextureManager {
    return TextureManager.instance;
  }

  setContext(gl: WebGL2RenderingContext): void {
    this.gl = gl;
  }

  async loadTexture(url: string): Promise<TextureData> {
    // Check if texture is already loaded
    const existingTexture = this.textures.get(url);
    if (existingTexture?.loaded) {
      return existingTexture;
    }

    if (!this.gl) {
      throw new Error('WebGL context not set. Call setContext first.');
    }

    const textureData: TextureData = {
      texture: null,
      image: null,
      url,
      width: 0,
      height: 0,
      loaded: false,
    };

    // Store placeholder immediately
    this.textures.set(url, textureData);

    try {
      // Load image
      const image = new Image();
      image.crossOrigin = 'anonymous'; // Handle CORS

      const loadPromise = new Promise<HTMLImageElement>((resolve, reject) => {
        image.onload = () => resolve(image);
        image.onerror = reject;
      });

      image.src = url;
      const loadedImage = await loadPromise;

      // Create WebGL texture
      const texture = this.gl.createTexture();
      if (!texture) {
        throw new Error('Failed to create WebGL texture');
      }

      this.gl.bindTexture(this.gl.TEXTURE_2D, texture);

      // Set texture parameters
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);

      // Upload image data to texture
      this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, loadedImage);

      // Update texture data
      textureData.texture = texture;
      textureData.image = loadedImage;
      textureData.width = loadedImage.naturalWidth;
      textureData.height = loadedImage.naturalHeight;
      textureData.loaded = true;

      this.textures.set(url, textureData);
      return textureData;
    } catch (error) {
      // Remove failed texture from cache
      this.textures.delete(url);
      throw new Error(`Failed to load texture from ${url}: ${error}`);
    }
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
    if (this.gl) {
      for (const textureData of this.textures.values()) {
        if (textureData.texture) {
          this.gl.deleteTexture(textureData.texture);
        }
      }
    }
    this.textures.clear();
  }
}
