import { GraphicsEngine } from './GraphicsEngine.class';

/**
 * Simple wrapper around HTMLCanvasElement that provides a clean API
 * and delegates complex graphics operations to GraphicsEngine
 */
export class Canvas {
  private canvasElement: HTMLCanvasElement;
  private engine: GraphicsEngine;

  constructor(canvas: HTMLCanvasElement) {
    this.canvasElement = canvas;
    this.engine = new GraphicsEngine(canvas);
  }

  // Delegate all graphics operations to the engine
  add(objectFactory: any) {
    return this.engine.add(objectFactory);
  }

  remove(object: any) {
    return this.engine.remove(object);
  }

  setZoom(zoom: number) {
    return this.engine.setZoom(zoom);
  }

  on(event: any, callback: (...args: any[]) => void) {
    return this.engine.on(event, callback);
  }

  off(event: any, callback: (...args: any[]) => void) {
    return this.engine.off(event, callback);
  }

  fire(event: any, ...args: any[]) {
    return this.engine.fire(event, ...args);
  }

  worldToScreen(x: number, y: number) {
    return this.engine.worldToScreen(x, y);
  }

  screenToWorld(x: number, y: number) {
    return this.engine.screenToWorld(x, y);
  }

  clear(r?: number, g?: number, b?: number, a?: number) {
    return this.engine.clear(r, g, b, a);
  }

  resize() {
    return this.engine.resize();
  }

  destroy() {
    return this.engine.destroy();
  }

  // Canvas-specific properties
  get width() {
    return this.canvasElement.clientWidth;
  }

  get height() {
    return this.canvasElement.clientHeight;
  }

  get zoom() {
    return this.engine.zoom;
  }

  get element() {
    return this.canvasElement;
  }

  // For backward compatibility - expose the engine
  get camera() {
    return this.engine.camera;
  }

  get world() {
    return this.engine.world;
  }

  get objects() {
    return this.engine.objects;
  }

  get renderer() {
    return { requestRender: () => this.engine.requestRender() };
  }

  getCtx() {
    return this.engine.getCtx();
  }
}
