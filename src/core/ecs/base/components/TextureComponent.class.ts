export interface TextureData {
  texture: WebGLTexture | null;
  image: HTMLImageElement | null;
  url: string;
  width: number;
  height: number;
  loaded: boolean;
  uvX: number;
  uvY: number;
  uvWidth: number;
  uvHeight: number;
  bin: number;
}

export class TextureComponent {
  public data: TextureData;

  constructor(data: TextureData) {
    this.data = data;
  }

  getTexture(): TextureData {
    return this.data;
  }

  setTexture(data: TextureData): void {
    this.data = data;
  }

  hasTexture(): boolean {
    return true;
  }
}

