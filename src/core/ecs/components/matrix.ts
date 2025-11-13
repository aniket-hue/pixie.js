import { m3 } from '../../math';
import { getChildren } from './children';
import { markDirty } from './dirty';
import { defineComponent } from './lib';
import { getParent } from './parent';

export const LocalMatrix = defineComponent({
  m00: 'f32',
  m01: 'f32',
  m02: 'f32',
  m10: 'f32',
  m11: 'f32',
  m12: 'f32',
  m20: 'f32',
  m21: 'f32',
  m22: 'f32',
});

export const WorldMatrix = defineComponent({
  m00: 'f32',
  m01: 'f32',
  m02: 'f32',
  m10: 'f32',
  m11: 'f32',
  m12: 'f32',
  m20: 'f32',
  m21: 'f32',
  m22: 'f32',
});

/**
 * Direct set functions - no propagation (for internal use)
 * Use these when you want to set matrices without triggering child updates
 */
export function setWorldMatrixDirect(eid: number, matrix: number[]): void {
  WorldMatrix.m00[eid] = matrix[0];
  WorldMatrix.m01[eid] = matrix[1];
  WorldMatrix.m02[eid] = matrix[2];
  WorldMatrix.m10[eid] = matrix[3];
  WorldMatrix.m11[eid] = matrix[4];
  WorldMatrix.m12[eid] = matrix[5];
  WorldMatrix.m20[eid] = matrix[6];
  WorldMatrix.m21[eid] = matrix[7];
  WorldMatrix.m22[eid] = matrix[8];
}

export function setLocalMatrixDirect(eid: number, matrix: number[]): void {
  LocalMatrix.m00[eid] = matrix[0];
  LocalMatrix.m01[eid] = matrix[1];
  LocalMatrix.m02[eid] = matrix[2];
  LocalMatrix.m10[eid] = matrix[3];
  LocalMatrix.m11[eid] = matrix[4];
  LocalMatrix.m12[eid] = matrix[5];
  LocalMatrix.m20[eid] = matrix[6];
  LocalMatrix.m21[eid] = matrix[7];
  LocalMatrix.m22[eid] = matrix[8];
}

function updateChildMatrices(eid: number) {
  const children = getChildren(eid);

  if (!children.length) {
    return;
  }

  const worldMatrix = getWorldMatrix(eid);

  for (const child of children) {
    const childLocalMatrix = getLocalMatrix(child);
    const newChildWorldMatrix = m3.multiply(worldMatrix, childLocalMatrix);

    setWorldMatrixDirect(child, newChildWorldMatrix);
    markDirty(child);

    updateChildMatrices(child);
  }
}

/**
 * Public API: Set local matrix with propagation
 * Updates world matrix based on parent, then propagates to children
 */
export function setLocalMatrix(eid: number, matrix: number[]) {
  setLocalMatrixDirect(eid, matrix);

  const parent = getParent(eid);
  if (parent) {
    const parentWorldMatrix = getWorldMatrix(parent);
    const newWorldMatrix = m3.multiply(parentWorldMatrix, matrix);
    setWorldMatrixDirect(eid, newWorldMatrix);
  } else {
    setWorldMatrixDirect(eid, matrix);
  }

  updateChildMatrices(eid);
}

/**
 * Public API: Set world matrix with propagation
 * If entity has parent, converts world to local, then propagates to children
 */
export function setWorldMatrix(eid: number, matrix: number[]) {
  const parent = getParent(eid);

  if (parent) {
    const parentWorldMatrix = getWorldMatrix(parent);
    const inverseParentWorld = m3.inverse(parentWorldMatrix);
    const newLocalMatrix = m3.multiply(inverseParentWorld, matrix);
    setLocalMatrixDirect(eid, newLocalMatrix);
  } else {
    setLocalMatrixDirect(eid, matrix);
  }

  setWorldMatrixDirect(eid, matrix);

  updateChildMatrices(eid);
}

export function getWorldMatrix(eid: number) {
  return [
    WorldMatrix.m00[eid],
    WorldMatrix.m01[eid],
    WorldMatrix.m02[eid],
    WorldMatrix.m10[eid],
    WorldMatrix.m11[eid],
    WorldMatrix.m12[eid],
    WorldMatrix.m20[eid],
    WorldMatrix.m21[eid],
    WorldMatrix.m22[eid],
  ];
}

export function getLocalMatrix(eid: number) {
  return [
    LocalMatrix.m00[eid],
    LocalMatrix.m01[eid],
    LocalMatrix.m02[eid],
    LocalMatrix.m10[eid],
    LocalMatrix.m11[eid],
    LocalMatrix.m12[eid],
    LocalMatrix.m20[eid],
    LocalMatrix.m21[eid],
    LocalMatrix.m22[eid],
  ];
}
