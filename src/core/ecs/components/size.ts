import { defineComponent } from './lib';

export const Size = defineComponent({
  width: 'f32',
  height: 'f32',
});

export const setWidth = (eid: number, width: number) => {
  Size.width[eid] = width;
};

export const setHeight = (eid: number, height: number) => {
  Size.height[eid] = height;
};

export const getWidth = (eid: number) => {
  return Size.width[eid];
};

export const getHeight = (eid: number) => {
  return Size.height[eid];
};
