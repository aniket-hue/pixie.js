import { Camera } from './Camera.class';
import { EventEmitter, type EventKeys } from './events';
import { InputHandler } from './input/InputHandler.class';
import { Renderer } from './Renderer.class';
import type { Shape } from './shapes/types';

export class Canvas {
  objects: Shape[] = [];

  canvas: HTMLCanvasElement;
  events: EventEmitter;
  renderer: Renderer;
  camera: Camera;
  inputHandler: InputHandler;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    this.events = new EventEmitter();

    this.camera = new Camera(
      {
        zoom: 1,
        x: 0,
        y: 0,
      },
      this,
    );

    this.renderer = new Renderer(this, this.camera);

    this.inputHandler = new InputHandler(canvas, this.camera);

    this.resize();
  }

  add(object: Shape) {
    this.objects.push(object);
  }

  getCtx() {
    return this.canvas.getContext('webgl');
  }

  setZoom(zoom: number) {
    this.camera.zoom = zoom;
  }

  on(event: EventKeys, callback: (...args: any[]) => void) {
    this.events.on(event, callback);
  }

  off(event: EventKeys, callback: (...args: any[]) => void) {
    this.events.off(event, callback);
  }

  fire(event: EventKeys, ...args: any[]) {
    this.events.emit(event, ...args);
  }

  get width() {
    return this.canvas.width;
  }

  get height() {
    return this.canvas.height;
  }

  resize() {
    const canvas = this.canvas;
    const displayWidth = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;

    if (canvas.width === displayWidth && canvas.height === displayHeight) {
      return;
    }

    canvas.width = displayWidth;
    canvas.height = displayHeight;

    this.getCtx()?.viewport(0, 0, canvas.width, canvas.height);
  }

  destroy() {
    this.events.destroy();
    this.renderer.destroy();
    this.inputHandler.destroy();
  }

  clear(r = 0, g = 0, b = 0, a = 1.0) {
    const gl = this.getCtx();

    if (!gl) {
      return;
    }

    gl.clearColor(r, g, b, a);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  render() {
    this.renderer.render();
  }
}
