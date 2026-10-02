import { createGroup } from '../factory/group';
import { overlaps } from '../utils/shapes';
import type { Entity } from './base/Entity.class';
import type { World } from './World.class';

export type Restack = 'front' | 'back' | 'forward' | 'backward';

export function withoutDescendants(entities: Entity[]): Entity[] {
  const set = new Set(entities);

  return [...set].filter((entity) => {
    for (let parent = entity.hierarchy.parent; parent; parent = parent.hierarchy.parent) {
      if (set.has(parent)) return false;
    }

    return true;
  });
}

function overlapping(world: World, entity: Entity): Set<Entity> {
  const { minX, minY, maxX, maxY } = entity.bounds.updateBounds();
  const near = world.query({ box: { minX, minY, maxX, maxY } });

  return new Set(near.filter((other) => other !== entity && overlaps(entity, other)));
}

function step(world: World, siblings: readonly Entity[], moving: ReadonlySet<Entity>, direction: 1 | -1): Entity[] {
  const next = [...siblings];
  const forward = direction === 1;
  let limit = forward ? next.length : -1;

  const order = forward ? [...next.keys()].reverse() : [...next.keys()];

  for (const start of order) {
    const entity = next[start];
    if (!moving.has(entity)) continue;

    const touching = overlapping(world, entity);
    let target = -1;

    for (let i = start + direction; i !== limit; i += direction) {
      if (!moving.has(next[i]) && touching.has(next[i])) {
        target = i;
        break;
      }
    }

    if (target === -1) {
      limit = start;
      continue;
    }

    next.splice(start, 1);
    next.splice(target, 0, entity);
    limit = target;
  }

  return next;
}

export function restack(world: World, entities: Entity[], how: Restack): boolean {
  const bySiblings = new Map<Entity[], Set<Entity>>();

  for (const entity of entities) {
    if (entity.world !== world) continue;

    const siblings = world.siblingsOf(entity);
    if (!bySiblings.has(siblings)) bySiblings.set(siblings, new Set());
    bySiblings.get(siblings)!.add(entity);
  }

  let changed = false;

  for (const [siblings, moving] of bySiblings) {
    let next: Entity[];

    if (how === 'front') {
      next = [...siblings.filter((entity) => !moving.has(entity)), ...siblings.filter((entity) => moving.has(entity))];
    } else if (how === 'back') {
      next = [...siblings.filter((entity) => moving.has(entity)), ...siblings.filter((entity) => !moving.has(entity))];
    } else {
      next = step(world, siblings, moving, how === 'forward' ? 1 : -1);
    }

    if (next.every((entity, index) => entity === siblings[index])) continue;

    siblings.splice(0, siblings.length, ...next);
    changed = true;
  }

  if (changed) world.invalidateOrder();

  return changed;
}

export function group(world: World, entities: Entity[]): Entity | null {
  const members = withoutDescendants(entities.filter((entity) => entity.world === world)).sort((a, b) => world.paintIndexOf(a) - world.paintIndexOf(b));
  if (!members.length) return null;

  const top = members[members.length - 1];
  const parent = top.hierarchy.parent;
  const memberSet = new Set(members);
  const siblings = world.siblingsOf(top);
  // Members leave this list when grouped, so only non-members below the top one count.
  const slot = siblings.slice(0, siblings.indexOf(top)).filter((entity) => !memberSet.has(entity)).length;

  const created = createGroup(members);

  if (parent) {
    parent.hierarchy.addChild(created, slot);
    return created;
  }

  world.addEntity(created);
  const roots = world.siblingsOf(created);
  roots.splice(roots.indexOf(created), 1);
  roots.splice(slot, 0, created);
  world.invalidateOrder();

  return created;
}

export function ungroup(world: World, target: Entity): Entity[] {
  if (target.world !== world) return [];

  const children = [...target.hierarchy.children];
  const parent = target.hierarchy.parent;
  const siblings = world.siblingsOf(target);
  const at = siblings.indexOf(target);

  children.forEach((child, index) => {
    if (parent) {
      parent.hierarchy.addChild(child, at + 1 + index);
    } else {
      target.hierarchy.removeChild(child);
    }
  });

  if (!parent) {
    // Leaving the group put each child on top of the roots; move them down into the group's slot.
    siblings.splice(siblings.length - children.length, children.length);
    siblings.splice(at + 1, 0, ...children);
  }

  world.removeEntity(target);

  return children;
}
