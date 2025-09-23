// World Space

export function getBoundingBoxFrom2Points(
  p1: {
    x: number;
    y: number;
  },
  p2: {
    x: number;
    y: number;
  },
) {
  const minX = Math.min(p1.x, p2.x);
  const maxX = Math.max(p1.x, p2.x);
  const minY = Math.min(p1.y, p2.y);
  const maxY = Math.max(p1.y, p2.y);

  const width = maxX - minX;
  const height = maxY - minY;

  const centerX = minX + width / 2;
  const centerY = minY + height / 2;

  return {
    minX,
    maxX,
    minY,
    maxY,
    centerX,
    centerY,
    width,
    height,
  };
}
