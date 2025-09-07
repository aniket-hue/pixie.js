import type { Canvas } from '../Canvas.class';
import { Events } from '../events';
import type { Shape } from '../shapes/Shape.class';

export class Selection {
  canvas: Canvas;
  hoverTarget: Shape | null;
  selectedTarget: Shape | null;
  isMouseDown: boolean;

  constructor(canvas: Canvas) {
    this.canvas = canvas;

    this.hoverTarget = null;
    this.selectedTarget = null;
    this.isMouseDown = false;

    this.initListeners();
  }

  initListeners() {
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);

    this.canvas.on(Events.MOUSE_MOVE, this.onMouseMove);
    this.canvas.on(Events.MOUSE_UP, this.onMouseUp);
    this.canvas.on(Events.MOUSE_DOWN, this.onMouseDown);
  }

  destroyListeners() {
    this.canvas.off(Events.MOUSE_MOVE, this.onMouseMove);
    this.canvas.off(Events.MOUSE_UP, this.onMouseUp);
    this.canvas.off(Events.MOUSE_DOWN, this.onMouseDown);
  }

  onMouseMove(event: MouseEvent) {
    const x = event.offsetX;
    const y = this.canvas.height - event.offsetY;

    if (this.isMouseDown && this.selectedTarget) {
      const screenCoords = this.canvas.screenToWorld(x, y);

      const worldX = screenCoords.x;
      const worldY = screenCoords.y;

      this.selectedTarget.setCenter(worldX, worldY);

      return;
    }

    this.hoverTarget = this.findTarget(x, y);
  }

  onMouseDown(event: MouseEvent) {
    event.preventDefault();
    this.isMouseDown = true;
    this.selectedTarget = this.hoverTarget;
  }

  onMouseUp() {
    this.isMouseDown = false;
  }

  findTarget(mouseX: number, mouseY: number) {
    for (let i = this.canvas.objects.length - 1; i >= 0; i--) {
      const object = this.canvas.objects[i];

      if (!object.isVisible()) {
        continue;
      }

      if (object.containsPoint(mouseX, mouseY)) {
        return object;
      }
    }

    return null;
  }
}
