import type { Point } from '../../types';
import type { Camera } from '../Camera.class';
import type { Canvas } from '../Canvas.class';
import type { Entity } from '../ecs/base/Entity.class';
import { EventBus, Events } from '../events';
import { PRIMARY_MODIFIER_KEY } from '../events/input/constants';
import { createSelectionGroup } from '../factory/selectionGroup';
import { assert } from '../lib/assert';
import { createBoundingBoxOfchildren } from '../utils/createBoundingBoxOfchildren';
import { AddSelection } from './AddSelection.class';
import { ClickSelection } from './ClickSelection.class';
import { MarqueeSelection } from './MarqueeSelection.class';
import { SelectionState } from './SelectionState.class';

export type SelectionManagerState = {
  enabled: boolean;
  startTime: number;
} | null;

export type Selections = {
  marquee: typeof MarqueeSelection;
  click: typeof ClickSelection;
  add: typeof AddSelection;
};

const DRAG_THRESHOLD = 2;

export class SelectionManager {
  private camera: Camera;
  private canvas: Canvas;

  private group: Entity | null = null;

  private childrenWithGroupsToRevertBack: Record<number, Entity> = {};
  private selectionStrategy: MarqueeSelection | ClickSelection | AddSelection;
  private selections: Selections = {
    marquee: MarqueeSelection,
    click: ClickSelection,
    add: AddSelection,
  };

  private state: SelectionManagerState = null;
  private stopSelection = false;

  selectionState: SelectionState;
  selectionBox: {
    start: Point;
    current?: Point;
  } | null = null;

  get activeGroup(): Entity | null {
    return this.group;
  }

  constructor(context: Canvas) {
    this.canvas = context;
    this.camera = context.camera;

    this.selectionState = new SelectionState();
    this.selectionStrategy = new this.selections.click(this.canvas, this.selectionState);

    this.initListeners();
  }

  private initListeners(): void {
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);

    EventBus.on(Events.MOUSE_MOVE, this.onMouseMove);
    EventBus.on(Events.MOUSE_DOWN, this.onMouseDown);
    EventBus.on(Events.MOUSE_UP, this.onMouseUp);
    EventBus.on(Events.KEY_DOWN, this.onKeyDown);
    EventBus.on(Events.KEY_UP, this.onKeyUp);
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (this.selectionStrategy instanceof MarqueeSelection) {
      return;
    }

    if (event.shiftKey) {
      this.selectionStrategy = new this.selections.add(this.canvas, this.selectionState);
    } else {
      this.selectionStrategy = new this.selections.click(this.canvas, this.selectionState);
    }
  }

  private onKeyUp(event: KeyboardEvent): void {
    if (this.selectionStrategy instanceof MarqueeSelection) {
      return;
    }

    if (!event.shiftKey && !event[PRIMARY_MODIFIER_KEY] && !event.altKey) {
      this.selectionStrategy = new this.selections.click(this.canvas, this.selectionState);
    }
  }

  private onMouseDown(event: MouseEvent): void {
    const x = event.offsetX;
    const y = event.offsetY;
    const worldPos = this.camera.screenToWorld(x, y);

    this.stopSelection = false;

    if (this.canvas.modeManager.isInteracting() || this.canvas.modeManager.isDrawing()) {
      this.selectionState.clearSelection();
      this.stopSelection = true;
      return;
    }

    if (this.group && this.canvas.picker.pick({ point: worldPos })?.includes(this.group)) {
      this.selectionState.clearSelection();
      this.stopSelection = true;
      return;
    }

    this.state = {
      enabled: true,
      startTime: Date.now(),
    };

    this.selectionBox = {
      start: { x, y },
    };

    if (this.selectionStrategy) {
      this.selectionStrategy.start(worldPos);
    }
  }

  private onMouseMove(event: MouseEvent): void {
    if (this.canvas.modeManager.isInteracting() || this.canvas.modeManager.isDrawing()) {
      this.selectionState.clearSelection();

      /**
       * This is a hack to stop selection when the user is interacting with the objects
       * Fix this
       * Try removing next line and start interacting with the objects in some group
       * group should get selected after moving or scaling the object.
       * This is because of race condition exists in interaction manager and onMouseUp.
       */
      this.stopSelection = true;
      return;
    }

    if (!this.state || this.stopSelection) {
      return;
    }

    const x = event.offsetX;
    const y = event.offsetY;

    assert(this.selectionBox !== null, 'Selection box is not set');

    const dx = x - this.selectionBox.start.x;
    const dy = y - this.selectionBox.start.y;

    if (Math.hypot(dx, dy) >= DRAG_THRESHOLD) {
      const currentPoint = this.camera.screenToWorld(x, y);

      if (this.selectionStrategy instanceof MarqueeSelection) {
        this.selectionStrategy.update(currentPoint);

        this.selectionBox = {
          start: this.selectionBox.start,
          current: { x, y },
        };
      } else {
        this.selectionStrategy = new this.selections.marquee(this.canvas, this.selectionState);
        this.selectionStrategy.start(currentPoint);
        this.removeGroup();
      }

      this.canvas.requestRender();
    }
  }

  private removeGroup(): void {
    if (!this.group) {
      return;
    }

    const children = [...(this.activeGroup?.hierarchy.children ?? [])];

    this.group.hierarchy.clearChildren();
    this.canvas.world.removeEntity(this.group);

    children?.forEach((child) => {
      if (this.childrenWithGroupsToRevertBack[child.id]) {
        const oldParent = this.childrenWithGroupsToRevertBack[child.id];
        oldParent.hierarchy.addChild(child);
      }
    });

    this.childrenWithGroupsToRevertBack = {};
    this.group = null;
  }

  private onMouseUp(): void {
    if (!this.state || !this.selectionStrategy || this.stopSelection) return;

    const entities = this.selectionStrategy.finish();

    if (entities?.length) {
      if (!this.group) {
        const revert = this.childrenWithGroupsToRevertBack;
        entities.forEach((e) => {
          if (e.hierarchy.parent) {
            revert[e.id] = e.hierarchy.parent;
          }
        });

        this.group = this.canvas.world.addEntity(createSelectionGroup({ children: entities })());

        this.canvas.fire(Events.SELECTION_GROUP_ADDED, { target: this.group });
      } else {
        const addedEntities = entities.filter((entity) => !this.group?.hierarchy.children.includes(entity));
        const removedEntities = this.group?.hierarchy.children.filter((entity) => !entities.includes(entity));

        removedEntities.forEach((child) => {
          const oldParent = this.childrenWithGroupsToRevertBack[child.id];

          if (oldParent) {
            oldParent.hierarchy.addChild(child);
            delete this.childrenWithGroupsToRevertBack[child.id];
          }
        });

        addedEntities.forEach((child) => {
          if (child.hierarchy.parent) {
            this.childrenWithGroupsToRevertBack[child.id] = child.hierarchy.parent;
          }
        });

        this.group.hierarchy.clearChildren();

        const { width, height, localMatrix } = createBoundingBoxOfchildren(entities);
        this.group.matrix.setLocalMatrix(localMatrix);
        this.group.matrix.setWorldMatrix();
        this.group.size.setWidth(width);
        this.group.size.setHeight(height);

        entities.forEach((e) => {
          this.group!.hierarchy.addChild(e);
        });

        this.canvas.fire(Events.SELECTION_GROUP_UPDATED, { target: this.group });
      }
    } else {
      const id = this.group?.id;
      this.removeGroup();
      this.canvas.fire(Events.SELECTION_GROUP_REMOVED, { target: this.group });
    }

    this.canvas.requestRender();

    this.state = null;
    this.selectionBox = null;

    if (this.selectionStrategy instanceof MarqueeSelection) {
      this.selectionStrategy = new this.selections.click(this.canvas, this.selectionState);
    }
  }

  public destroy(): void {
    EventBus.off(Events.MOUSE_MOVE, this.onMouseMove);
    EventBus.off(Events.MOUSE_DOWN, this.onMouseDown);
    EventBus.off(Events.MOUSE_UP, this.onMouseUp);
    EventBus.off(Events.KEY_DOWN, this.onKeyDown);
    EventBus.off(Events.KEY_UP, this.onKeyUp);
  }
}
