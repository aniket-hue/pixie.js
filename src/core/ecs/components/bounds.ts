import { computeBoundsOfMatrix } from '../../utils/computeBoundsOfMatrix';
import { defineComponent } from './lib';
import { getWorldMatrix } from './matrix';
import { getHeight, getWidth } from './size';

export const Bounds = defineComponent({
  minX: 'f32',
  minY: 'f32',
  maxX: 'f32',
  maxY: 'f32',
});

export function setBounds(eid: number) {
  const matrix = getWorldMatrix(eid);
  const size = { width: getWidth(eid), height: getHeight(eid) };

  const bounds = computeBoundsOfMatrix({ matrix, size });

  Bounds.minX[eid] = bounds.minX;
  Bounds.minY[eid] = bounds.minY;
  Bounds.maxX[eid] = bounds.maxX;
  Bounds.maxY[eid] = bounds.maxY;

  return bounds;
}

export function getBounds(eid: number) {
  return {
    minX: Bounds.minX[eid],
    minY: Bounds.minY[eid],
    maxX: Bounds.maxX[eid],
    maxY: Bounds.maxY[eid],
  };
}
