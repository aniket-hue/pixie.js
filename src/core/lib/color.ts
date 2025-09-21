// RGBA to ARGB (0-1 range)
export function rgbaToArgb(r: number, g: number, b: number, a: number): number {
  const red = r;
  const green = g;
  const blue = b;
  const alpha = a * 255;

  if (a === undefined) {
    return (red << 16) | (green << 8) | blue;
  }

  return (alpha << 24) | (red << 16) | (green << 8) | blue;
}

// ARGB to RGBA
export function argbToRgba(argb: number): number[] {
  if (argb > 0xffffff) {
    // Has alpha
    const a = ((argb >> 24) & 0xff) / 255;
    const r = ((argb >> 16) & 0xff) / 255;
    const g = ((argb >> 8) & 0xff) / 255;
    const b = (argb & 0xff) / 255;
    return [r, g, b, a];
  } else {
    // No alpha
    const r = ((argb >> 16) & 0xff) / 255;
    const g = ((argb >> 8) & 0xff) / 255;
    const b = (argb & 0xff) / 255;
    return [r, g, b, 1];
  }
}
