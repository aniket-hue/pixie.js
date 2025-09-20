export enum Events {
  RESIZE = 'resize',
  ZOOM_CHANGED = 'zoom_changed',
  PAN_CHANGED = 'pan_changed',

  MOUSE_MOVE = 'mouse_move',
  MOUSE_DOWN = 'mouse_down',
  MOUSE_UP = 'mouse_up',

  ADD_TO_SELECTION = 'add_to_selection',
  REMOVE_FROM_SELECTION = 'remove_from_selection',
}

export type EventKeys = Events;

export { EventEmitter } from './Events.class';
