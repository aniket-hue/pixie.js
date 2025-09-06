export enum Events {
  RESIZE = 'resize',
  ZOOM_CHANGED = 'zoom_changed',
  PAN_CHANGED = 'pan_changed',
}

export type EventKeys = Events;

export { EventEmitter } from './Events.class';
