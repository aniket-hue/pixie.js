import { vec2 } from './vector';

export function flipCoordinatesToWorldSpace(x: number, y: number) {
  const v1 = vec2(x, y);
  const v2 = vec2(1, -1);
  const v3 = v1.multiplyVector(v2);

  return {
    x: v3.x,
    y: v3.y,
  };
}
