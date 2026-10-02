import type { Entity } from '../ecs/base/Entity.class';

export const Events = {
  ZOOM_CHANGED: 'zoom_changed',
  PAN_CHANGED: 'pan_changed',

  POINTER_DOWN: 'pointer_down',
  POINTER_MOVE: 'pointer_move',
  POINTER_UP: 'pointer_up',

  KEY_DOWN: 'key_down',
  KEY_UP: 'key_up',

  SELECTION_CHANGED: 'selection_changed',
  OBJECT_MODIFIED: 'object_modified',
  ORDER_CHANGED: 'order_changed',
} as const;

export type EventMap = {
  zoom_changed: [zoom: number];
  pan_changed: [x: number, y: number];

  pointer_down: [event: PointerEvent];
  pointer_move: [event: PointerEvent];
  pointer_up: [event: PointerEvent];

  key_down: [event: KeyboardEvent];
  key_up: [event: KeyboardEvent];

  selection_changed: [selected: Entity[]];
  object_modified: [entities: Entity[]];
  // Any add, remove, restack, group or ungroup. Read the new tree with getObjects().
  order_changed: [];
};

export type EventKeys = keyof EventMap;

export { EventEmitter } from './Events.class';
