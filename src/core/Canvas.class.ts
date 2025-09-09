import { Camera } from './Camera.class';
import { Object } from './entities/Object.class';
import type { ObjectFactory } from './entities/types';
import { EventEmitter, type EventKeys } from './events';
import { InputHandler } from './input/InputHandler.class';
import { Renderer } from './Renderer.class';
import { World } from './World.class';
import { GlCore } from './webgl/GlCore.class';

const DEFAULT_CAMERA_CONFIG = {
  zoom: 1,
  x: 0,
  y: 0,
};

export class Canvas {
  world: World;
  objects: Object[];

  canvasElement: HTMLCanvasElement;
  events: EventEmitter;
  renderer: Renderer;
  camera: Camera;
  inputHandler: InputHandler;
  glCore: GlCore;

  constructor(canvas: HTMLCanvasElement) {
    this.canvasElement = canvas;

    this.objects = [];

    this.world = new World();
    this.events = new EventEmitter();
    this.glCore = new GlCore(this);
    this.camera = new Camera(this, DEFAULT_CAMERA_CONFIG);
    this.renderer = new Renderer(this);
    this.inputHandler = new InputHandler(this, this.camera);

    this.resize();
  }

  add(object: ObjectFactory) {
    const entityId = object.register(this.world);
    const objectInstance = new Object(this, entityId);

    this.objects.push(objectInstance);

    this.world.markDirty(entityId);
    this.renderer.requestRender();

    return objectInstance;
  }

  remove(object: any) {
    if (object.children) {
      object.children.forEach((child: number) => {
        this.world.removeComponent('parent', child);
        this.world.markDirty(child);
      });
    }

    this.world.removeEntity(object.entityId);

    this.renderer.requestRender();
  }

  getCtx() {
    return this.glCore.ctx;
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
    return this.canvasElement.clientWidth;
  }

  get height() {
    return this.canvasElement.clientHeight;
  }

  get zoom() {
    return this.camera.zoom;
  }

  resize() {
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

  worldToScreen(x: number, y: number) {
    return this.camera.worldToScreen(x, y);
  }

  screenToWorld(x: number, y: number) {
    return this.camera.screenToWorld(x, y);
  }
}
