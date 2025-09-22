import { defineComponent } from './lib';

export const Visibility = defineComponent({
  visible: 'f32',
});

export function setVisible(eid: number, visible: boolean) {
  Visibility.visible[eid] = visible ? 0 : 1;
}

export function isVisible(eid: number) {
  return Visibility.visible[eid] === 0;
}
