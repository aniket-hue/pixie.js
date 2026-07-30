import type { Entity } from '../Entity.class';

export const Dirty = {
  NONE: 0,
  TRANSFORM: 1 << 0,
  SIZE: 1 << 1,
  STYLE: 1 << 2,
  TEXTURE: 1 << 3,
  FILTERS: 1 << 4,
  VISIBILITY: 1 << 5,
  HIERARCHY: 1 << 6,
} as const;

export type DirtyMask = number;

export const DirtyMasks = {
  ALL: Dirty.TRANSFORM | Dirty.SIZE | Dirty.STYLE | Dirty.TEXTURE | Dirty.FILTERS | Dirty.VISIBILITY | Dirty.HIERARCHY,
  DATA: Dirty.TRANSFORM | Dirty.SIZE | Dirty.STYLE | Dirty.TEXTURE | Dirty.FILTERS,
  STRUCTURE: Dirty.VISIBILITY | Dirty.HIERARCHY,
  BOUNDS: Dirty.TRANSFORM | Dirty.SIZE,
} as const;

export type DirtyListener = (entity: Entity, channels: DirtyMask) => void;

export class DirtyComponent {
  public channels: DirtyMask = Dirty.NONE;

  private listener: DirtyListener | null = null;

  private entity: Entity;

  constructor(entity: Entity) {
    this.entity = entity;
  }

  markDirty(channels: DirtyMask = DirtyMasks.ALL): void {
    this.channels |= channels;

    this.listener?.(this.entity, channels);
  }

  isDirty(channels: DirtyMask = DirtyMasks.ALL): boolean {
    return (this.channels & channels) !== 0;
  }

  clearDirty(channels: DirtyMask = DirtyMasks.ALL): void {
    this.channels &= ~channels;
  }

  setListener(listener: DirtyListener | null): void {
    this.listener = listener;
  }

  get dirty(): boolean {
    return this.channels !== Dirty.NONE;
  }
}
