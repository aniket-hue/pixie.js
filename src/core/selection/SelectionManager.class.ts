import type { Point } from '../../types';
import type { Camera } from '../Camera.class';
import type { Canvas } from '../Canvas.class';
import { clearChildren } from '../ecs/components/children';
import { Events } from '../events';
import { PRIMARY_MODIFIER_KEY } from '../events/input/constants';
import { createSelectionGroup } from '../factory/selectionGroup';
import { AddSelection } from './AddSelection.class';
import { ClickSelection } from './ClickSelection.class';
import { MarqueeSelection } from './MarqueeSelection.class';
import { SelectionState } from './SelectionState.class';
import { ToggleSelection } from './ToggleSelection.class';

export type SelectionManagerState = {
  enabled: boolean;
  startTime: number;
  startPoint: Point;
  currentPoint: Point;
} | null;

export type Selections = {
  marquee: typeof MarqueeSelection;
  click: typeof ClickSelection;
  add: typeof AddSelection;
  toggle: typeof ToggleSelection;
};

const DRAG_THRESHOLD = 2;

export class SelectionManager {
  private camera: Camera;
  private canvas: Canvas;

  private group: number | null = null;

  private selectionStrategy: MarqueeSelection | ClickSelection | AddSelection | ToggleSelection;
  private selections: Selections = {
    marquee: MarqueeSelection,
    click: ClickSelection,
    add: AddSelection,
    toggle: ToggleSelection,
  };

  private state: SelectionManagerState = null;
  private stopSelection = false;

  selectionState: SelectionState;
  selectionBox: number[] | null = null;

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
    } else if (event[PRIMARY_MODIFIER_KEY]) {
      this.selectionStrategy = new this.selections.toggle(this.canvas, this.selectionState);
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
    const worldPos = this.camera.screenToWorld(event.offsetX, event.offsetY);

    this.stopSelection = false;

    if (this.group && this.canvas.picker.pick({ point: worldPos })?.includes(this.group)) {
      this.stopSelection = true;
      return;
    }

    this.state = {
      enabled: true,
      startTime: Date.now(),
      startPoint: worldPos,
      currentPoint: { x: 0, y: 0 },
    };

    if (this.selectionStrategy) {
      this.selectionStrategy.start(this.state.startPoint);
    }
  }

  private onMouseMove(event: MouseEvent): void {
    if (!this.state || this.stopSelection) {
      return;
    }

    const dx = event.x - this.state.startPoint.x;
    const dy = event.y - this.state.startPoint.y;

    this.state.currentPoint = this.camera.screenToWorld(event.offsetX, event.offsetY);

    if (Math.hypot(dx, dy) >= DRAG_THRESHOLD) {
      if (this.selectionStrategy instanceof MarqueeSelection) {
        this.selectionStrategy.update(this.state.currentPoint);
        this.selectionBox = this.selectionStrategy.marquee;
        this.canvas.requestRender();
      } else {
        this.selectionStrategy = new this.selections.marquee(this.canvas, this.selectionState);
        this.selectionStrategy.start(this.state.startPoint);
      }
    }
  }

  private onMouseUp(): void {
    const state = this.state;

    if (!state || !this.selectionStrategy || this.stopSelection) {
      return;
    }

    const entities = this.selectionStrategy.finish();
    let shouldFireRemoveEvent = false;

    if (this.group) {
      clearChildren(this.group);
      this.canvas.world.removeEntity(this.group);
      shouldFireRemoveEvent = true;
    }

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
