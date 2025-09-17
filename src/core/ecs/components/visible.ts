import { defineComponent } from './lib';

export const Visibility = defineComponent({
  visible: 'f32',
});

export function markVisible(eid: number, visible: boolean) {
  Visibility.visible[eid] = visible ? 1 : 0;
}

export function isVisible(eid: number) {
  return Visibility.visible[eid] === 1;
}
