import type { Canvas } from './Canvas.class';
import { Events } from './events';
import { m3 } from './math';

export interface Point {
  x: number;
  y: number;
}

export class Camera {
  minZoom: number = 0.1;
  maxZoom: number = 5;

  canvas: Canvas;
  viewportTransformMatrix: number[];

  constructor(
    canvas: Canvas,
    {
      zoom,
      x,
      y,
    }: {
      zoom: number;
      x: number;
      y: number;
    },
  ) {
    this.canvas = canvas;
    this.viewportTransformMatrix = [1, 0, 0, 0, 1, 0, 0, 0, 1];

    const clampedZoom = Math.max(this.minZoom, Math.min(this.maxZoom, zoom));
    const scaleMatrix = m3.scale(clampedZoom, clampedZoom);
    const translationMatrix = m3.translate(x + this.canvas.width / 2, y + this.canvas.height / 2);

    this.viewportTransformMatrix = m3.multiply(scaleMatrix, translationMatrix);
  }

  get zoom(): number {
    return this.viewportTransformMatrix[0];
  }

  get x(): number {
    return this.viewportTransformMatrix[6];
  }

  get y(): number {
    return this.viewportTransformMatrix[7];
  }

  set zoom(value: number) {
    const currentZoom = this.zoom;
    const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, value));
    const scale = newZoom / currentZoom;

    if (scale !== 1) {
      const scaleMatrix = m3.scale(scale, scale);
      this.viewportTransformMatrix = m3.multiply(this.viewportTransformMatrix, scaleMatrix);
    }

    this.canvas.fire(Events.ZOOM_CHANGED, this.zoom);
  }

  zoomAt(factor: number, screenX?: number, screenY?: number) {
    const zoomSensitivity = 0.005;
    let dZoom = Math.exp(-factor * zoomSensitivity);
    const currentZoom = this.zoom;
    let newZoom = currentZoom * dZoom;

    if (newZoom > this.maxZoom) {
      dZoom = this.maxZoom / currentZoom;
      newZoom = this.maxZoom;
    }

    if (newZoom < this.minZoom) {
      dZoom = this.minZoom / currentZoom;
      newZoom = this.minZoom;
    }

    if (dZoom === 1) return;

    if (screenX !== undefined && screenY !== undefined) {
      const pointX = screenX;
      const pointY = this.canvas.height - screenY;

      const translateToPoint = m3.translate(pointX, pointY);
      const scale = m3.scale(dZoom, dZoom);
      const translateFromPoint = m3.translate(-pointX, -pointY);

      let scaleAtPoint = m3.multiply(scale, translateFromPoint);
      scaleAtPoint = m3.multiply(translateToPoint, scaleAtPoint);

      this.viewportTransformMatrix = m3.multiply(scaleAtPoint, this.viewportTransformMatrix);
    } else {
      const scaleMatrix = m3.scale(dZoom, dZoom);
      this.viewportTransformMatrix = m3.multiply(this.viewportTransformMatrix, scaleMatrix);
    }

    this.canvas.fire(Events.ZOOM_CHANGED, this.zoom);
  }

  pan(deltaX: number, deltaY: number) {
    const currentZoom = this.zoom;
    const panX = -deltaX / currentZoom;
    const panY = deltaY / currentZoom;

    const translationMatrix = m3.translate(panX, panY);

    this.viewportTransformMatrix = m3.multiply(this.viewportTransformMatrix, translationMatrix);

    this.canvas.fire(Events.PAN_CHANGED, this.x, this.y);
  }

  screenToWorld(screenX: number, screenY: number) {
    const inverseMatrix = m3.inverse(this.viewportTransformMatrix);
    return m3.transformPoint(inverseMatrix, screenX, screenY);
  }

  worldToScreen(x: number, y: number) {
    const point = m3.transformPoint(this.viewportTransformMatrix, x, y);

    return {
      x: point.x,
      y: point.y,
    };
  }
}
