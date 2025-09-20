import { defineComponent } from './lib';
import { clearParent, updateParent } from './parent';

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

  updateParent(child, parent);
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

export function removeChild(parent: number, child: number) {
  const children = getChildren(parent);
  const index = children.indexOf(child);

  if (index !== -1) {
    children.splice(index, 1);
  }

  Children.count[parent]--;

  if (Children.count[parent] === 0) {
    Children.offset[parent] = 0;
  }

  clearParent(child);
}

export function clearChildren(parent: number) {
  const children = getChildren(parent);

  children.forEach((child) => {
    clearParent(child);
  });

  Children.count[parent] = 0;
  Children.offset[parent] = 0;
}
