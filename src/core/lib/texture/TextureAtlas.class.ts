import { MaxRectsPacker } from 'maxrects-packer';

export interface AtlasEntry {
  texture: WebGLTexture;
  x: number;
  y: number;
  width: number;
  height: number;
  uvX: number;
  uvY: number;
  uvWidth: number;
  uvHeight: number;
  bin: number;
}

export class TextureAtlas {
  private gl: WebGL2RenderingContext;
  private textures: WebGLTexture[] = [];
  private canvases: HTMLCanvasElement[] = [];
  private width: number;
  private height: number;
  private entries = new Map<string, AtlasEntry>();
  private packer: MaxRectsPacker;
  private needsUpdate = new Set<number>();

  constructor(gl: WebGL2RenderingContext, width = 4096, height = 4096) {
    this.gl = gl;
    this.width = width;
    this.height = height;

    this.packer = new MaxRectsPacker(width, height, 2, {
      smart: true,
      pot: false,
      square: false,
      allowRotation: false,
    });
  }

  private createBin(binIndex: number): void {
    const canvas = document.createElement('canvas');
    canvas.width = this.width;
    canvas.height = this.height;
    this.canvases[binIndex] = canvas;

    const texture = this.gl.createTexture();
    if (!texture) {
      throw new Error(`Failed to create texture for bin ${binIndex}`);
    }

    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);

    const data = new Uint8Array(this.width * this.height * 4);
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.width, this.height, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, data);

    this.textures[binIndex] = texture;
  }

  addImage(url: string, image: HTMLImageElement): AtlasEntry {
    const existingEntry = this.entries.get(url);

    if (existingEntry) {
      return existingEntry;
    }

    const imgWidth = image.naturalWidth || image.width;
    const imgHeight = image.naturalHeight || image.height;

    const packedRect = this.packer.add(imgWidth, imgHeight, url);
    const newCurrentBin = this.packer.bins.length - 1;

    if (!this.textures[newCurrentBin]) {
      console.log('creating bin', newCurrentBin);
      this.createBin(newCurrentBin);
    }

    const canvas = this.canvases[newCurrentBin];
    const ctx = canvas.getContext('2d');

    ctx?.drawImage(image, packedRect.x, packedRect.y, imgWidth, imgHeight);

    const entry: AtlasEntry = {
      texture: this.textures[newCurrentBin],
      x: packedRect.x,
      y: packedRect.y,
      width: imgWidth,
      height: imgHeight,
      uvX: packedRect.x / this.width,
      uvY: packedRect.y / this.height,
      uvWidth: imgWidth / this.width,
      uvHeight: imgHeight / this.height,
      bin: newCurrentBin,
    };

    this.entries.set(url, entry);
    this.needsUpdate.add(newCurrentBin);
    this.updateTexture(newCurrentBin);

    return entry;
  }

  updateTexture(bin: number): void {
    const texture = this.textures[bin];
    const canvas = this.canvases[bin];

    if (!texture || !canvas) return;

    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, canvas);
  }

  getEntry(url: string): AtlasEntry | undefined {
    return this.entries.get(url);
  }

  getTexture(bin: number): WebGLTexture | null {
    return this.textures[bin] || null;
  }

  cleanup(): void {
    for (const texture of this.textures) {
      if (texture) {
        this.gl.deleteTexture(texture);
      }
    }
    this.textures = [];
    this.canvases = [];
    this.entries.clear();
    this.needsUpdate.clear();
  }
}
