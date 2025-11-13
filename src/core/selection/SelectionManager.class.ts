import type { Point } from '../../types';
import type { Camera } from '../Camera.class';
import type { Canvas } from '../Canvas.class';
import { addChild, clearChildren, getChildren, removeChild } from '../ecs/components/children';
import { Events } from '../events';
import { PRIMARY_MODIFIER_KEY } from '../events/input/constants';
import { createSelectionGroup } from '../factory/selectionGroup';
import { assert } from '../lib/assert';
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

  private group: number | null = null;

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

  get activeGroup(): number | null {
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

    this.canvas.on(Events.MOUSE_MOVE, this.onMouseMove);
    this.canvas.on(Events.MOUSE_DOWN, this.onMouseDown);
    this.canvas.on(Events.MOUSE_UP, this.onMouseUp);
    this.canvas.on(Events.KEY_DOWN, this.onKeyDown);
    this.canvas.on(Events.KEY_UP, this.onKeyUp);
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

    if (this.canvas.modeManager.isInteracting()) {
      this.stopSelection = true;
      return;
    }

    if (this.group && this.canvas.picker.pick({ point: worldPos })?.includes(this.group)) {
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
    if (this.canvas.modeManager.isInteracting()) {
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

    clearChildren(this.group);
    this.canvas.world.removeEntity(this.group);
    this.group = null;
  }

  private onMouseUp(): void {
    const state = this.state;

    if (!state || !this.selectionStrategy || this.stopSelection) {
      return;
    }

    const entities = this.selectionStrategy.finish();

    if (entities?.length) {
      if (!this.group) {
        this.group = this.canvas.world.addEntityFactory(createSelectionGroup({ children: entities }));

        this.canvas.fire(Events.SELECTION_GROUP_ADDED, {
          id: this.group,
        });
      } else {
        const group = this.group;

        const oldChildren = getChildren(group);
        const removedEntities = oldChildren.filter((entity) => !entities.includes(entity));
        const addedEntities = entities.filter((entity) => !oldChildren.includes(entity));

        if (removedEntities.length || addedEntities.length) {
          removedEntities.forEach((entity) => {
            removeChild(group, entity);
          });

          addedEntities.forEach((entity) => {
            addChild(group, entity);
          });

          this.canvas.fire(Events.SELECTION_GROUP_UPDATED, {
            id: this.group,
          });
        }
      }
    } else {
      this.removeGroup();
      this.canvas.fire(Events.SELECTION_GROUP_REMOVED, {
        id: this.group,
      });
    }

    this.canvas.requestRender();

    this.state = null;
    this.selectionBox = null;

    if (this.selectionStrategy instanceof MarqueeSelection) {
      this.selectionStrategy = new this.selections.click(this.canvas, this.selectionState);
    }
  }

  public destroy(): void {
    this.canvas.off(Events.MOUSE_MOVE, this.onMouseMove);
    this.canvas.off(Events.MOUSE_DOWN, this.onMouseDown);
    this.canvas.off(Events.MOUSE_UP, this.onMouseUp);
    this.canvas.off(Events.KEY_DOWN, this.onKeyDown);
    this.canvas.off(Events.KEY_UP, this.onKeyUp);
  }
}
