import { Camera } from './Camera.class';
import { EventEmitter, type EventKeys } from './events';
import { InputHandler } from './input/InputHandler.class';
import type { IInputTarget, IRenderingContext } from './interfaces';
import { Renderer } from './Renderer.class';
import { Scene } from './Scene.class';
import { GlCore } from './webgl/GlCore.class';

export class GraphicsEngine implements IRenderingContext, IInputTarget {
  private canvasElement: HTMLCanvasElement;
  private events: EventEmitter;
  private glCore: GlCore;
  private renderer: Renderer;
  private inputHandler: InputHandler;

  camera: Camera;
  scene: Scene;

  constructor(canvas: HTMLCanvasElement) {
    this.canvasElement = canvas;

    this.events = new EventEmitter();
    this.scene = new Scene();

    this.glCore = new GlCore(this.canvasElement);

    this.camera = new Camera(this);
    this.renderer = new Renderer(this);
    this.inputHandler = new InputHandler(this);

    this.resize();
  }

  get width(): number {
    return this.canvasElement.clientWidth;
  }

  get height(): number {
    return this.canvasElement.clientHeight;
  }

  getCtx(): WebGLRenderingContext | null {
    return this.glCore.ctx;
  }

  clear(r = 0, g = 0, b = 0, a = 1.0): void {
    const gl = this.getCtx();
    if (!gl) return;

    gl.clearColor(r, g, b, a);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  resize(): void {
    const canvas = this.canvasElement;
    const displayWidth = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;

    if (canvas.width === displayWidth && canvas.height === displayHeight) {
      return;
    }

    canvas.width = displayWidth;
    canvas.height = displayHeight;

    this.getCtx()?.viewport(0, 0, canvas.width, canvas.height);
  }

  on(event: EventKeys, callback: (...args: any[]) => void): void {
    this.events.on(event, callback);
  }

  off(event: EventKeys, callback: (...args: any[]) => void): void {
    this.events.off(event, callback);
  }

  fire(event: EventKeys, ...args: any[]): void {
    this.events.emit(event, ...args);
  }

  worldToScreen(x: number, y: number): { x: number; y: number } {
    return this.camera.worldToScreen(x, y);
  }

  screenToWorld(x: number, y: number): { x: number; y: number } {
    return this.camera.screenToWorld(x, y);
  }

  setZoom(zoom: number): void {
    this.camera.zoom = zoom;
  }

  get zoom(): number {
    return this.camera.zoom;
  }

  get element(): HTMLCanvasElement {
    return this.canvasElement;
  }

  get world() {
    return this.scene.getWorld();
  }

  get objects() {
    return this.scene.getObjects();
  }

  requestRender(): void {
    this.renderer.requestRender();
  }

  add(objectFactory: any) {
    return this.scene.add(objectFactory, this);
  }

  remove(object: any) {
    this.scene.remove(object, this);
  }

  getGlCore() {
    return this.glCore;
  }

  destroy(): void {
    this.events.destroy();
    this.renderer.destroy();
    this.inputHandler.destroy();
    this.scene.destroy();
  }
}
