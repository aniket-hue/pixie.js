export const identityMatrix = [1, 0, 0, 0, 1, 0, 0, 0, 1];

function multiply(a: number[], b: number[]): number[] {
  const a00 = a[0 * 3 + 0];
  const a01 = a[0 * 3 + 1];
  const a02 = a[0 * 3 + 2];
  const a10 = a[1 * 3 + 0];
  const a11 = a[1 * 3 + 1];
  const a12 = a[1 * 3 + 2];
  const a20 = a[2 * 3 + 0];
  const a21 = a[2 * 3 + 1];
  const a22 = a[2 * 3 + 2];
  const b00 = b[0 * 3 + 0];
  const b01 = b[0 * 3 + 1];
  const b02 = b[0 * 3 + 2];
  const b10 = b[1 * 3 + 0];
  const b11 = b[1 * 3 + 1];
  const b12 = b[1 * 3 + 2];
  const b20 = b[2 * 3 + 0];
  const b21 = b[2 * 3 + 1];
  const b22 = b[2 * 3 + 2];

  return [
    b00 * a00 + b01 * a10 + b02 * a20,
    b00 * a01 + b01 * a11 + b02 * a21,
    b00 * a02 + b01 * a12 + b02 * a22,

    b10 * a00 + b11 * a10 + b12 * a20,
    b10 * a01 + b11 * a11 + b12 * a21,
    b10 * a02 + b11 * a12 + b12 * a22,

    b20 * a00 + b21 * a10 + b22 * a20,
    b20 * a01 + b21 * a11 + b22 * a21,
    b20 * a02 + b21 * a12 + b22 * a22,
  ];
}

export const m3 = {
  translate: (...args: [number, number] | [number[], number, number]) => {
    if (args.length === 2) {
      const [tx, ty] = args;
      return [1, 0, 0, 0, 1, 0, tx, ty, 1];
    }

    const [matrix, tx, ty] = args;
    return [matrix[0], matrix[1], matrix[2], matrix[3], matrix[4], matrix[5], tx, ty, matrix[8]];
  },

  identity: () => {
    return [1, 0, 0, 0, 1, 0, 0, 0, 1];
  },

  rotation: (...args: [number] | [number[], number]) => {
    if (args.length === 1) {
      const [angleInRadians] = args;
      const c = Math.cos(angleInRadians);
      const s = Math.sin(angleInRadians);
      return [c, -s, 0, s, c, 0, 0, 0, 1];
    }

    const [matrix, angleInRadians] = args;
    const c = Math.cos(angleInRadians);
    const s = Math.sin(angleInRadians);

    return [matrix[0], matrix[1], matrix[2], matrix[3], matrix[4], matrix[5], c, -s, 0, s, c, 0, 0, 0, 1];
  },

  scale: (...args: [number, number] | [number[], number, number]) => {
    if (args.length === 2) {
      const [sx, sy] = args;
      return [sx, 0, 0, 0, sy, 0, 0, 0, 1];
    }

    const [matrix, sx, sy] = args;
    return [matrix[0], matrix[1], matrix[2], matrix[3], matrix[4], matrix[5], sx, 0, 0, 0, sy, 0, 0, 0, 1];
  },

  multiply: (...args: number[][]) => {
    return args.reduce((a, b) => multiply(a, b), identityMatrix);
  },

  getScale: (a: number[]): number => {
    return Math.sqrt(a[0] * a[0] + a[1] * a[1]);
  },

  inverse: (a: number[]): number[] => {
    const det = a[0] * a[4] - a[1] * a[3];

    const invDet = 1 / det;
    return [
      a[4] * invDet,
      -a[1] * invDet,
      0,
      -a[3] * invDet,
      a[0] * invDet,
      0,
      (a[3] * a[7] - a[4] * a[6]) * invDet,
      (a[1] * a[6] - a[0] * a[7]) * invDet,
      1,
    ];
  },

  transformPoint: (matrix: number[], x: number, y: number): { x: number; y: number } => {
    return {
      x: matrix[0] * x + matrix[3] * y + matrix[6],
      y: matrix[1] * x + matrix[4] * y + matrix[7],
    };
  },

  compose: ({ tx, ty, sx, sy, r }: { tx: number; ty: number; sx: number; sy: number; r: number }) => {
    const scaleMatrix = m3.scale(sx, sy);
    const rotationMatrix = m3.rotation(r);
    const translationMatrix = m3.translate(tx, ty);

    return m3.multiply(translationMatrix, rotationMatrix, scaleMatrix);
  },
};
