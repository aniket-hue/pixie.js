import type { BoundingBox, Point } from '../types';
import type { Entity } from '../ecs/base/Entity.class';
import { m3 } from '../lib/math';

export function cornersOf(entity: Entity): Point[] {
  const m = entity.matrix.getWorldMatrix();
  const hw = entity.size.width / 2;
  const hh = entity.size.height / 2;

  return [
    [-hw, -hh],
    [hw, -hh],
    [hw, hh],
    [-hw, hh],
  ].map(([x, y]) => m3.transformPoint(m, x, y));
}

function boxCorners(box: BoundingBox): Point[] {
  return [
    { x: box.minX, y: box.minY },
    { x: box.maxX, y: box.minY },
    { x: box.maxX, y: box.maxY },
    { x: box.minX, y: box.maxY },
  ];
}

function project(points: Point[], axis: Point): [number, number] {
  let min = Infinity;
  let max = -Infinity;

  for (const point of points) {
    const value = point.x * axis.x + point.y * axis.y;
    min = Math.min(min, value);
    max = Math.max(max, value);
  }

  return [min, max];
}

function quadsOverlap(a: Point[], b: Point[]): boolean {
  for (const quad of [a, b]) {
    // Opposite edges of a rectangle are parallel, so two edges give both of its axes.
    for (let i = 0; i < 2; i++) {
      const axis = { x: quad[i + 1].y - quad[i].y, y: quad[i].x - quad[i + 1].x };
      if (axis.x === 0 && axis.y === 0) continue;

      const [aMin, aMax] = project(a, axis);
      const [bMin, bMax] = project(b, axis);
      if (aMax < bMin || bMax < aMin) return false;
    }
  }

  return true;
}

export function containsPoint(entity: Entity, point: Point): boolean {
  const local = m3.transformPoint(m3.inverse(entity.matrix.getWorldMatrix()), point.x, point.y);
  const hw = entity.size.width / 2;
  const hh = entity.size.height / 2;

  return local.x >= -hw && local.x <= hw && local.y >= -hh && local.y <= hh;
}

export function intersectsBox(entity: Entity, box: BoundingBox): boolean {
  return quadsOverlap(cornersOf(entity), boxCorners(box));
}

export function overlaps(a: Entity, b: Entity): boolean {
  return quadsOverlap(cornersOf(a), cornersOf(b));
}

export function setWorldTransform(entity: Entity, world: number[]): void {
  const parent = entity.hierarchy.parent;
  entity.matrix.setLocalMatrix(parent ? m3.multiply(m3.inverse(parent.matrix.getWorldMatrix()), world) : world);
  entity.matrix.setWorldMatrix();
}
