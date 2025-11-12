import type { Point } from '../../types';
import type { Camera } from '../Camera.class';
import type { Canvas } from '../Canvas.class';
import { clearChildren } from '../ecs/components/children';
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
    const x = event.clientX;
    const y = event.clientY;
    const worldPos = this.camera.screenToWorld(x, y);

    this.stopSelection = false;

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
    if (!this.state || this.stopSelection) {
      return;
    }

    const x = event.clientX;
    const y = event.clientY;

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
    let shouldFireRemoveEvent = false;

    this.removeGroup();

    if (entities?.length) {
      shouldFireRemoveEvent = false;
      this.group = this.canvas.world.addEntityFactory(createSelectionGroup({ children: entities }));
    }

    if (shouldFireRemoveEvent) {
      this.canvas.fire(Events.SELECTION_GROUP_REMOVED, {
        group: this.group,
      });
    } else {
      this.canvas.fire(Events.SELECTION_GROUP_ADDED, {
        group: this.group,
      });
    }

    this.state = null;
    this.selectionBox = null;
    this.canvas.requestRender();

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
