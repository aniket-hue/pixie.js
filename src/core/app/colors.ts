import { rgbaToArgb } from '../lib/color';

export const convertHelper = (color: string) => {
  const [_, r, g, b, a] = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);

  return rgbaToArgb(+r, +g, +b, +a);
};

export const SELECTION_BOX_BORDER_COLOR = convertHelper('rgba(29, 74, 235, 1)');
export const SELECTION_BOX_FILL_COLOR = convertHelper('rgba(255, 255, 255, 0)');
export const BLACK_COLOR = convertHelper('rgba(0, 0, 0, 1)');
export const WHITE_COLOR = convertHelper('rgba(255, 255, 255, 1)');
