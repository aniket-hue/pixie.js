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

  /**
   * @description Value Range [0, 2]
   */
  setBrightness(value: number) {
    this.brightness = value;
  }

  /**
   * @description Value Range [0, 2]
   */
  setContrast(value: number) {
    this.contrast = value;
  }

  /**
   * @description Value Range [0, 2]
   */
  setSaturation(value: number) {
    this.saturation = value;
  }

  /**
   * @description Value Range [0, 1]
   */
  setHue(value: number) {
    this.hue = value;
  }

  /**
   * @description Value Range [0, 1]
   */
  setSepia(value: number) {
    this.sepia = value;
  }

  /**
   * @description Value Range [0, 1]
   */
  setInvert(value: number) {
    this.invert = value;
  }
}
