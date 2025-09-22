import { defineComponent } from './lib';

export const Style = defineComponent({
  fill: 'f32',
  stroke: 'f32',
  strokeWidth: 'f32',
});

export const setFill = (eid: number, fill: number) => {
  Style.fill[eid] = fill;
};

export const setStroke = (eid: number, stroke: number) => {
  Style.stroke[eid] = stroke;
};

export const setStrokeWidth = (eid: number, strokeWidth: number) => {
  Style.strokeWidth[eid] = strokeWidth;
};

export const getFill = (eid: number) => {
  return Style.fill[eid];
};

export const getStroke = (eid: number) => {
  return Style.stroke[eid];
};

export const getStrokeWidth = (eid: number) => {
  return Style.strokeWidth[eid];
};
