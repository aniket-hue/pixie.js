import type { Camera } from '../Camera.class';
import type { Object } from '../entities/Object.class';
import type { EventKeys } from '../events';
import type { World } from '../World.class';

export interface IRenderTarget {
  width: number;
  height: number;
  getCtx(): WebGLRenderingContext | null;
  clear(r?: number, g?: number, b?: number, a?: number): void;
  resize(): void;
}

export interface IEventTarget {
  on(event: EventKeys, callback: (...args: any[]) => void): void;
  off(event: EventKeys, callback: (...args: any[]) => void): void;
  fire(event: EventKeys, ...args: any[]): void;
}

export interface ICameraTarget {
  camera: Camera;
  worldToScreen(x: number, y: number): { x: number; y: number };
  screenToWorld(x: number, y: number): { x: number; y: number };
  setZoom(zoom: number): void;
  get zoom(): number;
}

export interface ISceneTarget {
  world: World;
  objects: Object[];
}

export interface IInputTarget extends IEventTarget, ICameraTarget {
  width: number;
  height: number;
}

export interface IRenderingContext extends IRenderTarget, IEventTarget, ISceneTarget, ICameraTarget {
  requestRender(): void;
}
