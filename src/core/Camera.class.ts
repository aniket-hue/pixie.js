import type { BoundingBox, Point } from '../types';
import type { Canvas } from './Canvas.class';
import { Events } from './events';
import { m3 } from './lib/math';

export class Camera {
  minZoom = 0.001;
  maxZoom = 5;

  context: Canvas;
  viewportTransformMatrix: number[];

  constructor(context: Canvas, zoom = 1, x = 0, y = 0) {
    this.context = context;

    const clamped = Math.max(this.minZoom, Math.min(this.maxZoom, zoom));

    const scale = m3.scale(clamped, clamped);
    const translate = m3.translate(x + context.width / 2, y + context.height / 2);

    this.viewportTransformMatrix = m3.multiply(scale, translate);
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
    const current = this.zoom;
    const target = Math.max(this.minZoom, Math.min(this.maxZoom, value));
    const factor = target / current;

    if (factor !== 1) {
      const s = m3.scale(factor, factor);
      this.viewportTransformMatrix = m3.multiply(this.viewportTransformMatrix, s);
    }

    this.context.fire(Events.ZOOM_CHANGED, this.zoom);
  }

  zoomAt(delta: number, sx?: number, sy?: number) {
    const sensitivity = 0.005;
    this.zoomBy(Math.exp(-delta * sensitivity), sx, sy);
  }

  zoomBy(factor: number, sx?: number, sy?: number) {
    let newZoom = this.zoom * factor;

    if (newZoom > this.maxZoom) {
      factor = this.maxZoom / this.zoom;
      newZoom = this.maxZoom;
    }

    if (newZoom < this.minZoom) {
      factor = this.minZoom / this.zoom;
      newZoom = this.minZoom;
    }

    if (factor === 1) return;

    if (sx != null && sy != null) {
      const px = sx;
      const py = this.context.height - sy;

      const t1 = m3.translate(px, py);
      const s = m3.scale(factor, factor);
      const t2 = m3.translate(-px, -py);

      let m = m3.multiply(s, t2);
      m = m3.multiply(t1, m);

      this.viewportTransformMatrix = m3.multiply(m, this.viewportTransformMatrix);
    } else {
      const s = m3.scale(factor, factor);
      this.viewportTransformMatrix = m3.multiply(this.viewportTransformMatrix, s);
    }

    this.context.fire(Events.ZOOM_CHANGED, this.zoom);
    this.context.requestRender('Camera.zoomBy');
  }

  pan(dx: number, dy: number) {
    const z = this.zoom;

    const tx = -dx / z;
    const ty = dy / z;

    const t = m3.translate(tx, ty);

    this.viewportTransformMatrix = m3.multiply(this.viewportTransformMatrix, t);

    this.context.fire(Events.PAN_CHANGED, this.x, this.y);
    this.context.requestRender('Camera.pan');
  }

  /** The camera maps world space into the y-up GL viewport, hence centre . scale . -boxCentre. */
  fitToBounds(bounds: BoundingBox, padding = 1.1): void {
    const viewportWidth = this.context.width;
    const viewportHeight = this.context.height;

    const width = (bounds.maxX - bounds.minX) * padding;
    const height = (bounds.maxY - bounds.minY) * padding;

    if (width <= 0 || height <= 0 || viewportWidth === 0 || viewportHeight === 0) {
      return;
    }

    const fitted = Math.min(viewportWidth / width, viewportHeight / height);
    const zoom = Math.max(this.minZoom, Math.min(this.maxZoom, fitted));

    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;

    this.viewportTransformMatrix = m3.multiply(
      m3.translate(viewportWidth / 2, viewportHeight / 2),
      m3.scale(zoom, zoom),
      m3.translate(-centerX, -centerY),
    );

    this.context.fire(Events.ZOOM_CHANGED, this.zoom);
    this.context.fire(Events.PAN_CHANGED, this.x, this.y);
    this.context.requestRender('Camera.fitToBounds');
  }

  fitToScene(padding = 1.1): void {
    const bounds = this.context.world.getSceneBounds();

    if (bounds) {
      this.fitToBounds(bounds, padding);
    }
  }

  screenToWorld(sx: number, sy: number): Point {
    const y = this.context.height - sy;
    const inv = m3.inverse(this.viewportTransformMatrix);
    return m3.transformPoint(inv, sx, y);
  }

  worldToScreen(x: number, y: number): Point {
    const p = m3.transformPoint(this.viewportTransformMatrix, x, y);
    return { x: p.x, y: this.context.height - p.y };
  }
}
