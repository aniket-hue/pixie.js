import { m3 } from '../math';

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
  viewportTransformMatrix: number[];

  constructor(
    {
      zoom,
      x,
      y,
    }: {
      zoom: number;
      x: number;
      y: number;
    },
    canvas: HTMLCanvasElement,
  ) {
    this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, zoom));
    this.x = x;
    this.y = y;

    this.canvas = canvas;

    const scaleMatrix = m3.scaling(this.zoom, this.zoom);
    const translationMatrix = m3.translation(this.x, this.y);
    this.viewportTransformMatrix = m3.multiply(scaleMatrix, translationMatrix);
  }

  zoomAt(factor: number) {
    const zoomSensitivity = 0.005;
    let dZoom = Math.exp(-factor * zoomSensitivity);
    let newZoom = this.zoom * dZoom;

    if (newZoom > this.maxZoom) {
      dZoom = 1;
      newZoom = this.maxZoom;
    }

    if (newZoom < this.minZoom) {
      dZoom = 1;
      newZoom = this.minZoom;
    }

    const scaleMatrix = m3.scaling(dZoom, dZoom);

    this.viewportTransformMatrix = m3.multiply(this.viewportTransformMatrix, scaleMatrix);
    this.zoom = newZoom;
  }

  pan(x: number, y: number) {
    const translationMatrix = m3.translation(-x / this.zoom, -y / this.zoom);
    this.viewportTransformMatrix = m3.multiply(this.viewportTransformMatrix, translationMatrix);
  }

  convertScreenToWorld(x: number, y: number) {
    return {
      x: x / this.zoom - this.x,
      y: y / this.zoom - this.y,
    };
  }
}
