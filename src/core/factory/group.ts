import { Entity } from '../ecs/base/Entity.class';
import { createBoundingBoxOfchildren } from '../utils/createBoundingBoxOfchildren';
import { computeBoundsOfMatrix } from '../utils/computeBoundsOfMatrix';
import { m3 } from '../lib/math';

export function createGroup(children: Entity[]): Entity {
  const group = new Entity();

  const { width, height, localMatrix } = createBoundingBoxOfchildren(children);

  group.matrix.setLocalMatrix(localMatrix);
  group.matrix.setWorldMatrix();

  group.size.setWidth(width);
  group.size.setHeight(height);

  group.interaction.setDraggable(true);
  group.interaction.setSelectable(true);

  group.dirty.markDirty();

  for (const child of children) {
    group.hierarchy.addChild(child);
  }

  return group;
}

const EPSILON = 1e-6;

// Refits the box in the group's own frame, so a rotated or scaled group keeps its rotation and scale.
export function fitGroup(group: Entity): void {
  const children = group.hierarchy.children;
  if (!children.length) return;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const child of children) {
    const box = computeBoundsOfMatrix({ matrix: child.matrix.getLocalMatrix(), size: child.size });
    minX = Math.min(minX, box.minX);
    minY = Math.min(minY, box.minY);
    maxX = Math.max(maxX, box.maxX);
    maxY = Math.max(maxY, box.maxY);
  }

  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const width = maxX - minX;
  const height = maxY - minY;

  const unchanged =
    Math.abs(cx) < EPSILON &&
    Math.abs(cy) < EPSILON &&
    Math.abs(width - group.size.width) < EPSILON &&
    Math.abs(height - group.size.height) < EPSILON;
  if (unchanged) return;

  // Move the group's centre to the new box and shift children back, so nothing moves on screen.
  for (const child of children) {
    child.matrix.setLocalMatrix(m3.multiply(m3.translate(-cx, -cy), child.matrix.getLocalMatrix()));
  }
  group.matrix.setLocalMatrix(m3.translate(group.matrix.getLocalMatrix(), cx, cy));
  group.size.setWidth(width);
  group.size.setHeight(height);
  group.matrix.setWorldMatrix();
}
