export function computeBoundsOfMatrix({ matrix: m, size: { width: w, height: h } }: { matrix: number[]; size: { width: number; height: number } }) {
  const hw = w / 2;
  const hh = h / 2;

  const corners = [
    [-hw, -hh],
    [hw, -hh],
    [hw, hh],
    [-hw, hh],
  ];

  const transformed = corners.map(([x, y]) => {
    return {
      x: m[0] * x + m[3] * y + m[6],
      y: m[1] * x + m[4] * y + m[7],
    };
  });

  let minX = Infinity,
    minY = Infinity;
  let maxX = -Infinity,
    maxY = -Infinity;

  for (const { x, y } of transformed) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }

  return { minX, minY, maxX, maxY };
}
