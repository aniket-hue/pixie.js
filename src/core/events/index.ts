export enum Events {
  RESIZE = 'resize',
  ZOOM_CHANGED = 'zoom_changed',
  PAN_CHANGED = 'pan_changed',

  MOUSE_MOVE = 'mouse_move',
  MOUSE_DOWN = 'mouse_down',
  MOUSE_UP = 'mouse_up',

  KEY_DOWN = 'key_down',
  KEY_UP = 'key_up',

  ADD_TO_SELECTION = 'add_to_selection',
  REMOVE_FROM_SELECTION = 'remove_from_selection',
  CLEAR_SELECTION = 'clear_selection',

  OBJECT_MODIFIED = 'object_modified',

  SELECTION_GROUP_ADDED = 'selection_group_added',
  SELECTION_GROUP_REMOVED = 'selection_group_removed',
  SELECTION_GROUP_UPDATED = 'selection_group_updated',
}

export type EventKeys = Events;

export { EventEmitter } from './Events.class';
