export enum Events {
  RESIZE = 'resize',
  ZOOM_CHANGED = 'zoom_changed',
  PAN_CHANGED = 'pan_changed',

  MOUSE_MOVE = 'mouse_move',
  MOUSE_DOWN = 'mouse_down',
  MOUSE_UP = 'mouse_up',
}

export type EventKeys = Events;

export { EventEmitter } from './Events.class';
