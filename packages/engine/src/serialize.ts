import { TextureComponent } from './ecs/base/components/TextureComponent.class';
import { Entity } from './ecs/base/Entity.class';

const FILTERS = ['brightness', 'contrast', 'saturation', 'hue', 'sepia', 'invert'] as const;

type Filters = Record<(typeof FILTERS)[number], number>;

export type SceneNode = {
  type: 'rect' | 'image' | 'group';
  // Local transform [a, b, c, d, tx, ty]; a matrix, not x/y/angle, so skew from scaled groups survives.
  matrix: [number, number, number, number, number, number];
  width: number;
  height: number;
  fill: number;
  stroke: number;
  strokeWidth: number;
  visible: boolean;
  selectable: boolean;
  draggable: boolean;
  url?: string;
  filters?: Filters;
  children?: SceneNode[];
};

export type SceneJSON = { version: 1; objects: SceneNode[] };

export function serialize(entities: readonly Entity[]): SceneNode[] {
  return entities.map((entity) => {
    const m = entity.matrix.getLocalMatrix();
    const node: SceneNode = {
      type: 'rect',
      matrix: [m[0], m[1], m[3], m[4], m[6], m[7]],
      width: entity.size.width,
      height: entity.size.height,
      fill: entity.style.fill,
      stroke: entity.style.stroke,
      strokeWidth: entity.style.strokeWidth,
      visible: entity.visibility.visible,
      selectable: entity.interaction.selectable,
      draggable: entity.interaction.draggable,
    };

    const texture = entity.texture;
    if (texture) {
      node.type = 'image';
      node.url = texture.data.url;
      node.filters = Object.fromEntries(FILTERS.map((key) => [key, texture[key]])) as Filters;
    }

    if (entity.hierarchy.children.length) {
      node.type = 'group';
      node.children = serialize(entity.hierarchy.children);
    }

    return node;
  });
}

function check(ok: boolean, path: string, problem: string): void {
  if (!ok) throw new Error(`Invalid scene at ${path}: ${problem}`);
}

const isNumber = (value: unknown) => typeof value === 'number' && Number.isFinite(value);

// Loaded JSON comes from outside, so every field is checked before any entity is built.
function validate(node: unknown, path: string): asserts node is SceneNode {
  check(typeof node === 'object' && node !== null, path, 'not an object');
  const n = node as Record<string, unknown>;

  check(n.type === 'rect' || n.type === 'image' || n.type === 'group', path, `unknown type ${String(n.type)}`);
  check(Array.isArray(n.matrix) && n.matrix.length === 6 && n.matrix.every(isNumber), path, 'matrix must be 6 numbers');

  for (const key of ['width', 'height', 'fill', 'stroke', 'strokeWidth']) {
    check(isNumber(n[key]), path, `${key} must be a number`);
  }
  for (const key of ['visible', 'selectable', 'draggable']) {
    check(typeof n[key] === 'boolean', path, `${key} must be a boolean`);
  }

  if (n.type === 'image') {
    check(typeof n.url === 'string', path, 'image needs a url');
    const filters = n.filters as Record<string, unknown> | undefined;
    check(filters === undefined || FILTERS.every((key) => isNumber(filters[key])), path, 'filters must be numbers');
  }

  if (n.type === 'group') {
    check(Array.isArray(n.children) && n.children.length > 0, path, 'group needs children');
    (n.children as unknown[]).forEach((child, index) => validate(child, `${path}.children[${index}]`));
  }
}

function build(node: SceneNode): Entity {
  const entity = new Entity();
  const [a, b, c, d, tx, ty] = node.matrix;

  entity.matrix.setLocalMatrix([a, b, 0, c, d, 0, tx, ty, 1]);
  entity.size.setWidth(node.width);
  entity.size.setHeight(node.height);
  entity.style.setFill(node.fill);
  entity.style.setStroke(node.stroke);
  entity.style.setStrokeWidth(node.strokeWidth);
  entity.visibility.setVisible(node.visible);
  entity.interaction.setSelectable(node.selectable);
  entity.interaction.setDraggable(node.draggable);

  if (node.type === 'image') {
    // Both sides requested, so the loaded image keeps the saved size instead of its natural one.
    const texture = new TextureComponent(entity, { url: node.url!, width: 0, height: 0, loaded: false }, { width: node.width, height: node.height });
    for (const key of FILTERS) {
      if (node.filters) texture[key] = node.filters[key];
    }
    entity.texture = texture;
  }

  // Linked directly: addChild would reinterpret the saved local matrix as a world one.
  for (const childNode of node.children ?? []) {
    const child = build(childNode);
    child.hierarchy.parent = entity;
    entity.hierarchy.children.push(child);
  }

  return entity;
}

// Returns new top-level entities, not yet on any canvas; pass them to canvas.add().
export function deserialize(scene: unknown): Entity[] {
  check(typeof scene === 'object' && scene !== null, 'scene', 'not an object');
  const { version, objects } = scene as Record<string, unknown>;

  check(version === 1, 'scene', `unsupported version ${String(version)}`);
  check(Array.isArray(objects), 'scene', 'objects must be an array');
  (objects as unknown[]).forEach((node, index) => validate(node, `objects[${index}]`));

  return (objects as SceneNode[]).map((node) => {
    const entity = build(node);
    entity.matrix.setWorldMatrix();
    return entity;
  });
}
