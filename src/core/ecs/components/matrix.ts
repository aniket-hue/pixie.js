import { computeBoundsOfMatrix } from '../../utils/computeBoundsOfMatrix';
import { defineComponent } from './lib';
import { getHeight, getWidth } from './size';

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

export const Bounds = defineComponent({
  minX: 'f32',
  minY: 'f32',
  maxX: 'f32',
  maxY: 'f32',
});

export function updateBounds(eid: number) {
  const matrix = getWorldMatrix(eid);
  const size = { width: getWidth(eid), height: getHeight(eid) };

  const bounds = computeBoundsOfMatrix({ matrix, size });

  Bounds.minX[eid] = bounds.minX;
  Bounds.minY[eid] = bounds.minY;
  Bounds.maxX[eid] = bounds.maxX;
  Bounds.maxY[eid] = bounds.maxY;
}

export function getBounds(eid: number) {
  return {
    minX: Bounds.minX[eid],
    minY: Bounds.minY[eid],
    maxX: Bounds.maxX[eid],
    maxY: Bounds.maxY[eid],
  };
}

export function updateLocalMatrix(eid: number, matrix: number[]) {
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

export function updateWorldMatrix(eid: number, matrix: number[]) {
  WorldMatrix.m00[eid] = matrix[0];
  WorldMatrix.m01[eid] = matrix[1];
  WorldMatrix.m02[eid] = matrix[2];
  WorldMatrix.m10[eid] = matrix[3];
  WorldMatrix.m11[eid] = matrix[4];
  WorldMatrix.m12[eid] = matrix[5];
  WorldMatrix.m20[eid] = matrix[6];
  WorldMatrix.m21[eid] = matrix[7];
  WorldMatrix.m22[eid] = matrix[8];

  updateBounds(eid);
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
