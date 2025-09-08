import { Camera } from './Camera.class';
import type { Bounds, Children, Transform } from './ecs/components/types';
import { World } from './ecs/World.class';
import { EventEmitter, type EventKeys } from './events';
import { InputHandler } from './input/InputHandler.class';
import { m3 } from './math';
import { Renderer } from './Renderer.class';

export class Canvas {
  objects = [];

  // ECS World
  world: World;

  canvasElement: HTMLCanvasElement;
  events: EventEmitter;
  renderer: Renderer;
  camera: Camera;
  inputHandler: InputHandler;

  constructor(canvas: HTMLCanvasElement) {
    this.canvasElement = canvas;

    this.world = new World();
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
    this.inputHandler = new InputHandler(this, this.camera);

    this.resize();
  }

  add(object: any) {
    ['transform', 'style', 'size', 'bounds', 'interaction', 'parent', 'children'].forEach((component) => {
      if (component in object) {
        this.world.addComponent(component, object.entityId, object[component]);

        if (component === 'children') {
          const parentEntityId = object.entityId;
          const children = object.children;
          const parentTransform = object.transform;

          children.forEach((childId: number) => {
            // Get the child's current world position before setting parent
            const childTransform = this.world.getComponent<Transform>('transform', childId);

            if (childTransform && parentTransform) {
              // Convert child's world position to local position relative to parent
              // Local position = child world position - parent world position
              const localX = childTransform.position.x - parentTransform.position.x;
              const localY = childTransform.position.y - parentTransform.position.y;

              // Update child's transform to use local coordinates
              this.world.updateComponent<Transform>('transform', childId, {
                position: { x: localX, y: localY },
              });
            }

            this.world.addComponent('parent', childId, parentEntityId);
          });
        }
      }
    });

    this.world.markDirty(object.entityId);
    this.renderer.requestRender();

    return object.entityId;
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
    return this.canvasElement.getContext('webgl');
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
