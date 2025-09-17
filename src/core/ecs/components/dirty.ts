import { defineComponent } from './lib';

export const Dirty = defineComponent({
  dirty: 'f32',
});

export function markDirty(eid: number) {
  Dirty.dirty[eid] = 1;
}

export function isDirty(eid: number) {
  return Dirty.dirty[eid] === 1;
}

export function clearDirty(eid: number) {
  Dirty.dirty[eid] = 0;
}

export function clearAllDirty() {
  Dirty.dirty.fill(0);
}
