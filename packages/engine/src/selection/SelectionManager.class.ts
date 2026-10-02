import type { Point } from "../types";
import type { Camera } from "../Camera.class";
import type { Canvas } from "../Canvas.class";
import { Entity } from "../ecs/base/Entity.class";
import { withoutDescendants } from "../ecs/order";
import { Events } from "../events";
import { PRIMARY_MODIFIER_KEY } from "../events/input/constants";
import { m3 } from "../lib/math";
import { createBoundingBoxOfchildren } from "../utils/createBoundingBoxOfchildren";
import { getBoundingBoxFrom2Points } from "../utils/getBoundingBoxFrom2Points";
import { setWorldTransform } from "../utils/shapes";

const DRAG_THRESHOLD = 2;
// Own timer, not `dblclick`: that event never fires for touch and pen double taps.
const DOUBLE_PRESS_MS = 400;
const DOUBLE_PRESS_SLOP = 6;

type Press = {
  screen: Point;
  world: Point;
  hit: Entity | null;
  toggle: boolean;
  base: Entity[];
  moved: boolean;
};

const stateOf = (entity: Entity) => [
  ...entity.matrix.getWorldMatrix(),
  entity.size.width,
  entity.size.height,
];

// Outermost selectable ancestor-or-self below `scope`; null when the entity isn't inside it.
export function selectionTarget(
  entity: Entity,
  scope: Entity | null = null,
): Entity | null {
  let target: Entity | null = null;

  for (
    let current: Entity | null = entity;
    current !== scope;
    current = current.hierarchy.parent
  ) {
    if (!current) return null;
    if (current.interaction.selectable) target = current;
  }

  return target;
}

const isVisible = (entity: Entity) => entity.visibility.visible;

export class SelectionManager {
  private camera: Camera;
  private canvas: Canvas;

  private members: Entity[] = [];
  private box: Entity | null = null;
  private fitted = new Map<Entity, number[]>();
  private transformStart: {
    frame: number[];
    members: Map<Entity, number[]>;
  } | null = null;
  private press: Press | null = null;
  private lastPress: { time: number; screen: Point } | null = null;

  selectionBox: { start: Point; current?: Point } | null = null;
  preview: Entity[] = [];
  // What a click here would select, outlined so nested groups are not a guess.
  hovered: Entity | null = null;

  get frame(): Entity | null {
    return this.box;
  }

  get selected(): Entity[] {
    return [...this.members];
  }

  constructor(context: Canvas) {
    this.canvas = context;
    this.camera = context.camera;

    this.initListeners();
  }

  private initListeners(): void {
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onPointerLeave = this.onPointerLeave.bind(this);

    this.canvas.on(Events.POINTER_MOVE, this.onMouseMove);
    this.canvas.on(Events.POINTER_DOWN, this.onMouseDown);
    this.canvas.on(Events.POINTER_UP, this.onMouseUp);
    this.canvas.on(Events.KEY_DOWN, this.onKeyDown);
    this.canvas.element.addEventListener("pointerleave", this.onPointerLeave);
  }

  select(entities: Entity[]): void {
    const next = withoutDescendants(entities.filter((entity) => entity.world));
    const unchanged =
      next.length === this.members.length &&
      next.every((entity) => this.members.includes(entity));

    if (unchanged) {
      return;
    }

    this.members = next;
    this.transformStart = null;
    this.box = null;
    if (next.length) {
      this.box = new Entity();
      this.box.interaction.setDraggable(true);
    }
    this.fitFrame();

    this.canvas.fire(Events.SELECTION_CHANGED, this.selected);
    this.canvas.requestRender("SelectionManager.select");
  }

  clearSelection(): void {
    this.select([]);
  }

  selectAll(): void {
    this.select(
      this.canvas
        .getObjects()
        .filter(
          (entity) =>
            entity.interaction.selectable && entity.visibility.visible,
        ),
    );
  }

  isSelected(entity: Entity): boolean {
    for (
      let current: Entity | null = entity;
      current;
      current = current.hierarchy.parent
    ) {
      if (this.members.includes(current)) return true;
    }

    return false;
  }

  private fitFrame(): void {
    const frame = this.box;
    if (!frame) return;

    const { width, height, localMatrix } = createBoundingBoxOfchildren(
      this.members,
    );
    frame.matrix.setLocalMatrix(localMatrix);
    frame.matrix.setWorldMatrix();
    frame.size.setWidth(width);
    frame.size.setHeight(height);

    this.fitted = new Map(
      this.members.map((entity) => [entity, stateOf(entity)]),
    );
  }

  syncFrame(): void {
    if (this.transformStart || !this.box) return;

    const changed = this.members.some((entity) => {
      const before = this.fitted.get(entity);
      const now = stateOf(entity);
      return !before || now.some((value, index) => value !== before[index]);
    });

    if (changed) this.fitFrame();
  }

  beginTransform(): void {
    if (!this.box) return;

    this.transformStart = {
      frame: this.box.matrix.getWorldMatrix(),
      members: new Map(
        this.members.map((entity) => [entity, entity.matrix.getWorldMatrix()]),
      ),
    };
  }

  applyTransform(): void {
    const start = this.transformStart;
    if (!start || !this.box) return;

    const delta = m3.multiply(
      this.box.matrix.getWorldMatrix(),
      m3.inverse(start.frame),
    );

    for (const [entity, world] of start.members) {
      setWorldTransform(entity, m3.multiply(delta, world));
    }
  }

  cancelTransform(): void {
    const start = this.transformStart;
    if (!start || !this.box) return;

    setWorldTransform(this.box, start.frame);
    for (const [entity, world] of start.members) {
      setWorldTransform(entity, world);
    }

    this.endTransform();
  }

  endTransform(): void {
    if (!this.transformStart) return;

    this.transformStart = null;
    this.fitted = new Map(
      this.members.map((entity) => [entity, stateOf(entity)]),
    );
  }

  // The group the selection sits in, so clicks pick its siblings instead of the whole group.
  private get scope(): Entity | null {
    for (
      let parent = this.members[0]?.hierarchy.parent;
      parent;
      parent = parent.hierarchy.parent
    ) {
      if (parent.interaction.selectable) return parent;
    }

    return null;
  }

  private pickTarget(
    world: Point,
    scope: Entity | null,
    onlyInside = false,
  ): Entity | null {
    for (const entity of this.canvas.query({ point: world }, isVisible)) {
      let target = selectionTarget(entity, scope);
      if (!target && !onlyInside) target = selectionTarget(entity);
      if (target) return target;
    }

    return null;
  }

  private isDoublePress(event: PointerEvent, screen: Point): boolean {
    const last = this.lastPress;
    this.lastPress = { time: event.timeStamp, screen };

    if (!last) return false;

    const quick = event.timeStamp - last.time < DOUBLE_PRESS_MS;
    const still =
      Math.hypot(screen.x - last.screen.x, screen.y - last.screen.y) <
      DOUBLE_PRESS_SLOP;

    // A third press starts a new pair, so it does not step in again.
    if (quick && still) this.lastPress = null;

    return quick && still;
  }

  private hover(event: PointerEvent): void {
    if (this.canvas.modeManager.isInteracting()) {
      this.setHovered(null);
      return;
    }

    const world = this.camera.screenToWorld(event.offsetX, event.offsetY);
    this.setHovered(this.pickTarget(world, this.scope));
  }

  private onMouseDown(event: PointerEvent): void {
    this.setHovered(null);

    if (this.canvas.modeManager.isInteracting()) {
      return;
    }

    const screen = { x: event.offsetX, y: event.offsetY };
    const world = this.camera.screenToWorld(screen.x, screen.y);
    const toggle = event.shiftKey || event[PRIMARY_MODIFIER_KEY];
    const selected = this.selected;
    let hit = this.pickTarget(world, this.scope);

    // Double press on a selected group steps one level into it.
    const enters =
      this.isDoublePress(event, screen) &&
      !toggle &&
      !!hit &&
      selected.includes(hit) &&
      hit.hierarchy.children.length > 0;
    if (enters) {
      hit = this.pickTarget(world, hit, true) ?? hit;
    }

    this.press = { screen, world, hit, toggle, base: [], moved: false };

    if (!hit) return;

    // Selecting on press, not release, lets the same drag move what was just picked.
    const isSelected = selected.includes(hit);

    if (toggle && isSelected) {
      this.select(selected.filter((entity) => entity !== hit));
    } else if (toggle) {
      this.select([...selected, hit]);
    } else if (!isSelected) {
      this.select([hit]);
    }
  }

  private setHovered(entity: Entity | null): void {
    if (entity === this.hovered) return;

    this.hovered = entity;
    this.canvas.requestRender("SelectionManager.hover");
  }

  private onPointerLeave(): void {
    this.setHovered(null);
  }

  private onMouseMove(event: PointerEvent): void {
    const press = this.press;
    if (!press) {
      this.hover(event);
      return;
    }

    if (this.canvas.modeManager.isInteracting()) {
      press.moved = true;
      return;
    }

    const screen = { x: event.offsetX, y: event.offsetY };

    if (!this.selectionBox) {
      const farEnough =
        Math.hypot(screen.x - press.screen.x, screen.y - press.screen.y) >=
        DRAG_THRESHOLD;
      if (press.hit || !farEnough) return;

      this.selectionBox = { start: press.screen };
      press.base = press.toggle ? this.selected : [];
      if (!press.toggle) this.clearSelection();
    }

    press.moved = true;
    this.selectionBox.current = screen;

    const box = getBoundingBoxFrom2Points(
      press.world,
      this.camera.screenToWorld(screen.x, screen.y),
    );
    const inside = this.canvas.query({ box }, isVisible).map((entity) => selectionTarget(entity));
    this.preview = withoutDescendants([
      ...press.base,
      ...inside.filter((entity) => entity !== null),
    ]);

    this.canvas.requestRender("SelectionManager.marquee");
  }

  private onMouseUp(): void {
    const press = this.press;
    this.press = null;
    if (!press) return;

    if (this.selectionBox) {
      const preview = this.preview;

      this.selectionBox = null;
      this.preview = [];
      this.select(preview);
      this.canvas.requestRender("SelectionManager.marqueeEnd");
      return;
    }

    if (press.moved || press.toggle) return;

    this.select(press.hit ? [press.hit] : []);
  }

  private onKeyDown(event: KeyboardEvent): void {
    // TransformControls takes Esc first to cancel a drag; that press must not also change the selection.
    if (event.key === "Escape" && event.defaultPrevented) return;

    if (event.key === "Escape") {
      const scope = this.scope;
      if (scope) {
        this.select([scope]);
      } else {
        this.clearSelection();
      }
      return;
    }

    if (!event[PRIMARY_MODIFIER_KEY]) return;

    // `code`, not `key`: Shift turns "]" into "}", and keyboard layouts move the brackets.
    const shortcuts: Record<string, () => void> = {
      KeyA: () => this.selectAll(),
      BracketRight: () => this.restack(event.shiftKey ? "front" : "forward"),
      BracketLeft: () => this.restack(event.shiftKey ? "back" : "backward"),
      KeyG: () => this.groupShortcut(event.shiftKey),
    };

    const action = shortcuts[event.code];
    if (!action) return;

    event.preventDefault();
    action();
  }

  private restack(how: "front" | "back" | "forward" | "backward"): void {
    const selected = this.selected;

    if (how === "front") {
      this.canvas.bringToFront(selected);
    } else if (how === "back") {
      this.canvas.sendToBack(selected);
    } else if (how === "forward") {
      this.canvas.bringForward(selected);
    } else {
      this.canvas.sendBackward(selected);
    }
  }

  private groupShortcut(ungroup: boolean): void {
    if (!ungroup) {
      const created = this.canvas.group(this.selected);
      if (created) this.select([created]);
      return;
    }

    const groups = this.selected.filter(
      (entity) => entity.hierarchy.children.length,
    );
    if (groups.length)
      this.select(groups.flatMap((entity) => this.canvas.ungroup(entity)));
  }

  public destroy(): void {
    this.canvas.off(Events.POINTER_MOVE, this.onMouseMove);
    this.canvas.off(Events.POINTER_DOWN, this.onMouseDown);
    this.canvas.off(Events.POINTER_UP, this.onMouseUp);
    this.canvas.off(Events.KEY_DOWN, this.onKeyDown);
    this.canvas.element.removeEventListener("pointerleave", this.onPointerLeave);
  }
}
