import { m3 } from '../../math';
import { createBoundingBoxOfchildren } from '../../utils/createBoundingBoxOfchildren';
import { markDirty } from './dirty';
import { defineComponent } from './lib';
import { getWorldMatrix, setLocalMatrix, setWorldMatrix } from './matrix';
import { clearParent, updateParent } from './parent';
import { setHeight, setWidth } from './size';

let _ptr = 0;

export const Children = defineComponent({
  offset: 'u32',
  count: 'u32',
  buffer: 'u32',
});

function updateChildrenCoords(parentId: number) {
  const children = getChildren(parentId);
  const { width, height, localMatrix: parentMatrix } = createBoundingBoxOfchildren(children);

  setLocalMatrix(parentId, parentMatrix);
  setWorldMatrix(parentId, parentMatrix);
  setWidth(parentId, width);
  setHeight(parentId, height);
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

export function addChild(parent: number, child: number) {
  if (Children.count[parent] === 0) {
    Children.offset[parent] = _ptr;
  }

  const idx = Children.offset[parent] + Children.count[parent];
  Children.buffer[idx] = child;
  Children.count[parent]++;
  _ptr++;

  updateParent(child, parent);
  updateChildrenCoords(parent);
  markDirty(child);
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
    markDirty(child);
  });

  Children.count[parent] = 0;
  Children.offset[parent] = 0;
}
