export interface Point {
  x: number;
  y: number;
}

export class Camera {
  zoom: number;
  x: number;
  y: number;

  minZoom: number = 0.1;
  maxZoom: number = 5;
  canvas: HTMLCanvasElement;

  constructor(zoom: number, canvas: HTMLCanvasElement) {
    this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, zoom));
    this.canvas = canvas;
    this.x = 0;
    this.y = 0;
  }

  zoomAt(factor: number) {
    const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom + factor));
    this.zoom = newZoom;
  }

  pan(x: number, y: number) {
    this.x += x / this.zoom;
    this.y += y / this.zoom;
  }

  convertScreenToWorld(x: number, y: number) {
    return {
      x: x / this.zoom - this.x,
      y: y / this.zoom - this.y,
    };
  }
}
