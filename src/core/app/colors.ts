import { rgbaToArgb } from '../lib/color';

export const convertHelper = (color: string) => {
  const [_, r, g, b, a] = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
  return rgbaToArgb(+r, +g, +b, +a);
};

export const SELECTION_BOX_BORDER_COLOR = convertHelper('rgba(29, 74, 235, 1)');
export const SELECTION_BOX_FILL_COLOR = convertHelper('rgba(201, 209, 239, 0.1)');
