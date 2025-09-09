export enum Events {
  RESIZE = 'resize',
  ZOOM_CHANGED = 'zoom_changed',
  PAN_CHANGED = 'pan_changed',

  MOUSE_MOVE = 'mouse_move',
  MOUSE_DOWN = 'mouse_down',
  MOUSE_UP = 'mouse_up',

  KEY_DOWN = 'key_down',
  KEY_UP = 'key_up',

  RENDER = 'render',

  COMPONENTS_UPDATED = 'components_updated',
}

export type EventKeys = Events;

export { EventEmitter } from './Events.class';
