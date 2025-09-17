import { defineComponent } from './lib';

let _ptr = 0;

export const Children = defineComponent({
  offset: 'u32',
  count: 'u32',
  buffer: 'u32',
});

export function addChild(parent: number, child: number) {
  if (Children.count[parent] === 0) {
    Children.offset[parent] = _ptr;
  }

  const idx = Children.offset[parent] + Children.count[parent];
  Children.buffer[idx] = child;
  Children.count[parent]++;
  _ptr++;
}

export function getChildren(parent: number): number[] {
  const start = Children.offset[parent];
  const len = Children.count[parent];
  const result: number[] = [];
  for (let i = 0; i < len; i++) {
    result.push(Children.buffer[start + i]);
  }
  return result;
}
