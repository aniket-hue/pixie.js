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

  public brightness = 1.0;
  public contrast = 1.0;
  public saturation = 1.0;
  public hue = 0.0;
  public sepia = 0.0;
  public invert = 0.0;

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

  setBrightness(value: number) {
    this.brightness = value;
  }

  setContrast(value: number) {
    this.contrast = value;
  }

  setSaturation(value: number) {
    this.saturation = value;
  }

  setHue(value: number) {
    this.hue = value;
  }

  setSepia(value: number) {
    this.sepia = value;
  }

  setInvert(value: number) {
    this.invert = value;
  }
}
