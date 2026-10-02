import type { Point } from '../../../types';
import type { Canvas } from '../../Canvas.class';
import { containsPoint } from '../../utils/shapes';
import { Events } from '../index';

const LINE_HEIGHT = 16;

function isTyping(event: KeyboardEvent) {
  const target = event.target as HTMLElement | null;
  return !!target && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
}

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const midpoint = (a: Point, b: Point) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

export class InputHandler {
  private canvas: Canvas;
  private canvasElement: HTMLCanvasElement;

  private forwarded: PointerEvent | null = null;
  private panning: { pointerId: number; last: Point } | null = null;
  private touches = new Map<number, Point>();
  private pinch: { distance: number; center: Point } | null = null;
  private touchSpent = false;
  private spaceDown = false;

  constructor(context: Canvas) {
    this.canvas = context;
    this.canvasElement = context.element;
    this.handleWheel = this.handleWheel.bind(this);
    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handlePointerUp = this.handlePointerUp.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.handleBlur = this.handleBlur.bind(this);
    this.setupEventListeners();
  }

  private setupEventListeners() {
    this.canvasElement.addEventListener('wheel', this.handleWheel, { passive: false });
    this.canvasElement.addEventListener('pointerdown', this.handlePointerDown);
    this.canvasElement.addEventListener('pointermove', this.handlePointerMove);
    this.canvasElement.addEventListener('pointerup', this.handlePointerUp);
    this.canvasElement.addEventListener('pointercancel', this.handlePointerUp);
    this.canvasElement.addEventListener('contextmenu', this.preventContextMenu);
    this.canvasElement.addEventListener('mousedown', this.preventAutoscroll);
    document.addEventListener('keydown', this.handleKeyDown);
    document.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);

    // The page must not scroll or zoom under a finger, and drags must not select page text.
    this.canvasElement.style.touchAction = 'none';
    this.canvasElement.style.userSelect = 'none';
    this.canvasElement.style.cursor = 'default';
  }

  private handleWheel(event: WheelEvent) {
    event.preventDefault();

    let unit = 1;
    if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
      unit = LINE_HEIGHT;
    } else if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
      unit = this.canvas.height;
    }

    let dx = event.deltaX * unit;
    let dy = event.deltaY * unit;

    // A trackpad pinch arrives as Ctrl+wheel on every OS, so Ctrl zooms on Mac too.
    if (event.ctrlKey || event.metaKey) {
      this.canvas.camera.zoomAt(dy, event.offsetX, event.offsetY);
      return;
    }

    if (event.shiftKey && dx === 0) {
      dx = dy;
      dy = 0;
    }

    this.canvas.camera.pan(dx, dy);
  }

  private handlePointerDown(event: PointerEvent) {
    // Keep receiving this pointer when it leaves the canvas, so a release over other UI still ends the drag.
    this.canvasElement.setPointerCapture(event.pointerId);

    const point = { x: event.offsetX, y: event.offsetY };

    if (event.pointerType === 'touch') {
      this.touchDown(event, point);
      return;
    }

    const wantsPan = event.button === 1 || (event.button === 0 && this.spaceDown);

    if (wantsPan) {
      this.startPan(event.pointerId, point);
      return;
    }

    if (event.button !== 0) {
      return;
    }

    // A press while one is still open means its release was lost; close it first.
    this.endForwarded();
    this.forwarded = event;
    this.canvas.fire(Events.POINTER_DOWN, event);
  }

  private touchDown(event: PointerEvent, point: Point) {
    this.touches.set(event.pointerId, point);

    if (this.touchSpent || this.touches.size > 2) {
      return;
    }

    if (this.touches.size === 2) {
      this.endForwarded();
      this.panning = null;

      const [a, b] = [...this.touches.values()];
      this.pinch = { distance: distance(a, b), center: midpoint(a, b) };
      return;
    }

    if (this.isOnContent(point)) {
      this.forwarded = event;
      this.canvas.fire(Events.POINTER_DOWN, event);
    } else {
      this.startPan(event.pointerId, point);
    }
  }

  private isOnContent(point: Point) {
    if (this.canvas.modeManager.isDrawing() || this.canvas.transformControls?.handleAt(point, 'touch')) {
      return true;
    }

    const world = this.canvas.camera.screenToWorld(point.x, point.y);
    const frame = this.canvas.selectionManager.frame;

    return this.canvas.query({ point: world }).length > 0 || (!!frame && containsPoint(frame, world));
  }

  private handlePointerMove(event: PointerEvent) {
    const point = { x: event.offsetX, y: event.offsetY };

    if (this.touches.has(event.pointerId)) {
      this.touches.set(event.pointerId, point);
    }

    if (this.pinch) {
      this.updatePinch();
      return;
    }

    if (this.panning?.pointerId === event.pointerId) {
      // Content follows the pointer, so the camera moves the opposite way.
      this.canvas.camera.pan(this.panning.last.x - point.x, this.panning.last.y - point.y);
      this.panning.last = point;
      return;
    }

    if (this.forwarded?.pointerId === event.pointerId) {
      this.forwarded = event;
      this.canvas.fire(Events.POINTER_MOVE, event);
      return;
    }

    const hovering = !this.forwarded && !this.panning && !this.spaceDown && event.pointerType !== 'touch';

    if (hovering) {
      this.canvas.fire(Events.POINTER_MOVE, event);
    }
  }

  private updatePinch() {
    const [a, b] = [...this.touches.values()];
    const center = midpoint(a, b);
    const spread = distance(a, b);
    const pinch = this.pinch!;

    this.canvas.camera.pan(pinch.center.x - center.x, pinch.center.y - center.y);

    if (pinch.distance > 0 && spread > 0) {
      this.canvas.camera.zoomBy(spread / pinch.distance, center.x, center.y);
    }

    this.pinch = { distance: spread, center };
  }

  private handlePointerUp(event: PointerEvent) {
    this.touches.delete(event.pointerId);

    if (this.pinch) {
      this.pinch = null;
      this.touchSpent = this.touches.size > 0;
      return;
    }

    if (!this.touches.size) {
      this.touchSpent = false;
    }

    if (this.panning?.pointerId === event.pointerId) {
      this.panning = null;
      this.canvasElement.style.cursor = this.spaceDown ? 'grab' : 'default';
      return;
    }

    if (this.forwarded?.pointerId === event.pointerId) {
      this.forwarded = null;
      this.canvas.fire(Events.POINTER_UP, event);
    }
  }

  /** A second finger turns a drag into a pinch, so whatever the first finger started ends where it is. */
  private endForwarded() {
    const last = this.forwarded;
    if (!last) return;

    this.forwarded = null;
    this.canvas.fire(Events.POINTER_UP, last);
  }

  private startPan(pointerId: number, point: Point) {
    this.panning = { pointerId, last: point };
    this.canvasElement.style.cursor = 'grabbing';
  }

  private handleKeyDown(event: KeyboardEvent) {
    if (isTyping(event)) return;

    if (event.code === 'Space') {
      // Stops the page from scrolling while space is held to pan.
      event.preventDefault();

      if (!this.spaceDown && !this.panning) {
        this.canvasElement.style.cursor = 'grab';
      }

      this.spaceDown = true;
      return;
    }

    this.canvas.fire(Events.KEY_DOWN, event);
  }

  private handleKeyUp(event: KeyboardEvent) {
    if (event.code === 'Space') {
      this.releaseSpace();
      return;
    }

    if (isTyping(event)) return;

    this.canvas.fire(Events.KEY_UP, event);
  }

  /** Alt+Tab with space held never delivers the keyup. */
  private handleBlur() {
    this.releaseSpace();
  }

  private releaseSpace() {
    if (!this.spaceDown) return;

    this.spaceDown = false;

    if (!this.panning) {
      this.canvasElement.style.cursor = 'default';
    }
  }

  private preventContextMenu(event: MouseEvent) {
    event.preventDefault();
  }

  /** Middle-button drag pans; without this, Chrome on Windows starts autoscroll instead. */
  private preventAutoscroll(event: MouseEvent) {
    if (event.button === 1) event.preventDefault();
  }

  destroy() {
    this.canvasElement.removeEventListener('contextmenu', this.preventContextMenu);
    this.canvasElement.removeEventListener('mousedown', this.preventAutoscroll);
    this.canvasElement.removeEventListener('wheel', this.handleWheel);
    this.canvasElement.removeEventListener('pointerdown', this.handlePointerDown);
    this.canvasElement.removeEventListener('pointermove', this.handlePointerMove);
    this.canvasElement.removeEventListener('pointerup', this.handlePointerUp);
    this.canvasElement.removeEventListener('pointercancel', this.handlePointerUp);
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
  }
}
