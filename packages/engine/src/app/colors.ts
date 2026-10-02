import { rgbaToArgb } from '../lib/color';

export const convertHelper = (color: string) => {
  const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);

  if (!match) {
    throw new Error(`convertHelper: expected an rgb()/rgba() string, got "${color}"`);
  }

  const [, r, g, b, a] = match;

  return rgbaToArgb(+r, +g, +b, +a);
};

export const SELECTION_BOX_BORDER_COLOR = 'rgba(29, 74, 235, 1)';
export const SELECTION_BOX_FILL_COLOR = 'rgba(255, 0, 255, 1)';
export const BLACK_COLOR = convertHelper('rgba(0, 0, 0, 1)');
export const WHITE_COLOR = convertHelper('rgba(255, 255, 255, 1)');
