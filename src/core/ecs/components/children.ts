import { m3 } from '../../math';
import { createBoundingBoxOfchildren } from '../../utils/createBoundingBoxOfchildren';
import { markDirty } from './dirty';
import { defineComponent } from './lib';
import { getLocalMatrix, getWorldMatrix, setLocalMatrixDirect, setWorldMatrixDirect } from './matrix';
import { clearParent, getParent, updateParent } from './parent';
import { setHeight, setWidth } from './size';

let _ptr = 0;

export const Children = defineComponent({
  offset: 'u32',
  count: 'u32',
  buffer: 'u32',
});

function convertChildrenToLocalSpace(parentId: number) {
  const children = getChildren(parentId);
  if (!children.length) {
    return;
  }

  const parentLocalMatrix = getLocalMatrix(parentId);
  const parentWorldMatrix = getWorldMatrix(parentId);
  const inverseParentLocal = m3.inverse(parentLocalMatrix);

  for (const child of children) {
    const childWorldMatrix = getWorldMatrix(child);
    const childLocalMatrix = m3.multiply(inverseParentLocal, childWorldMatrix);

    setLocalMatrixDirect(child, childLocalMatrix);

    const newChildWorldMatrix = m3.multiply(parentWorldMatrix, childLocalMatrix);
    setWorldMatrixDirect(child, newChildWorldMatrix);

    markDirty(child);
  }
}

function updateChildrenCoords(parentId: number) {
  const children = getChildren(parentId);

  if (!children.length) {
    const identity = m3.identity();
    setLocalMatrixDirect(parentId, identity);
    setWorldMatrixDirect(parentId, identity);
    setWidth(parentId, 0);
    setHeight(parentId, 0);
    return;
  }

  const { width, height, localMatrix: parentLocalMatrix } = createBoundingBoxOfchildren(children);

  setLocalMatrixDirect(parentId, parentLocalMatrix);

  const parentParent = getParent(parentId);
  if (parentParent) {
    const parentParentWorld = getWorldMatrix(parentParent);
    const parentWorldMatrix = m3.multiply(parentParentWorld, parentLocalMatrix);
    setWorldMatrixDirect(parentId, parentWorldMatrix);
  } else {
    setWorldMatrixDirect(parentId, parentLocalMatrix);
  }

  setWidth(parentId, width);
  setHeight(parentId, height);

  convertChildrenToLocalSpace(parentId);
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
  markDirty(parent);
}

export function removeChild(parent: number, child: number) {
  const children = getChildren(parent);
  const index = children.indexOf(child);

  if (index === -1) {
    return;
  }

  for (let i = index; i < children.length - 1; i++) {
    Children.buffer[Children.offset[parent] + i] = Children.buffer[Children.offset[parent] + i + 1];
  }

  Children.count[parent]--;

  if (Children.count[parent] === 0) {
    Children.offset[parent] = 0;
  }

  clearParent(child);

  const childLocalMatrix = getLocalMatrix(child);
  const parentWorldMatrix = getWorldMatrix(parent);
  const childWorldMatrix = m3.multiply(parentWorldMatrix, childLocalMatrix);
  setWorldMatrixDirect(child, childWorldMatrix);
  setLocalMatrixDirect(child, childWorldMatrix);

  updateChildrenCoords(parent);

  markDirty(child);
  markDirty(parent);
}

export function clearChildren(parent: number) {
  const children = getChildren(parent);

  const parentWorldMatrix = getWorldMatrix(parent);
  children.forEach((child) => {
    const childLocalMatrix = getLocalMatrix(child);
    const childWorldMatrix = m3.multiply(parentWorldMatrix, childLocalMatrix);
    setWorldMatrixDirect(child, childWorldMatrix);
    setLocalMatrixDirect(child, childWorldMatrix);
    clearParent(child);
    markDirty(child);
  });

  Children.count[parent] = 0;
  Children.offset[parent] = 0;

  updateChildrenCoords(parent);

  markDirty(parent);
}
