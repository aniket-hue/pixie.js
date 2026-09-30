import type { Canvas } from '../../Canvas.class';
import { Events } from '../index';
import { PRIMARY_MODIFIER_KEY } from './constants';

export class InputHandler {
  private canvas: Canvas;
  private canvasElement: HTMLCanvasElement;

  constructor(context: Canvas) {
    this.canvas = context;
    this.canvasElement = context.element;
    this.handleWheel = this.handleWheel.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.setupEventListeners();
  }

  private setupEventListeners() {
    // Mouse wheel for zoom
    this.canvasElement.addEventListener('wheel', this.handleWheel);
    this.canvasElement.addEventListener('mousemove', this.handleMouseMove);
    this.canvasElement.addEventListener('mousedown', this.handleMouseDown);
    this.canvasElement.addEventListener('mouseup', this.handleMouseUp);
    document.addEventListener('keydown', this.handleKeyDown);
    document.addEventListener('keyup', this.handleKeyUp);

    // Prevent context menu
    this.canvasElement.addEventListener('contextmenu', this.preventContextMenu);

    // Set cursor style
    this.canvasElement.style.cursor = 'default';
  }

  private handleWheel(event: WheelEvent) {
    event.preventDefault();

    const rect = this.canvasElement.getBoundingClientRect();

    if (event[PRIMARY_MODIFIER_KEY]) {
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;

      this.canvas.camera.zoomAt(event.deltaY, mouseX, mouseY);
    } else {
      this.canvas.camera.pan(event.deltaX, event.deltaY);
    }
  }

  private handleMouseMove(event: MouseEvent) {
    event.preventDefault();

    this.canvas.fire(Events.MOUSE_MOVE, event);
  }

  private handleMouseDown(event: MouseEvent) {
    event.preventDefault();

    this.canvas.fire(Events.MOUSE_DOWN, event);
  }

  private handleMouseUp(event: MouseEvent) {
    event.preventDefault();

    this.canvas.fire(Events.MOUSE_UP, event);
  }

  private handleKeyDown(event: KeyboardEvent) {
    this.canvas.fire(Events.KEY_DOWN, event);
  }

  private handleKeyUp(event: KeyboardEvent) {
    this.canvas.fire(Events.KEY_UP, event);
  }

  private preventContextMenu(event: MouseEvent) {
    event.preventDefault();
  }

  // Cleanup event listeners
  destroy() {
    this.canvasElement.removeEventListener('contextmenu', this.preventContextMenu);

    this.canvasElement.removeEventListener('wheel', this.handleWheel);
    this.canvasElement.removeEventListener('mousemove', this.handleMouseMove);
    this.canvasElement.removeEventListener('mousedown', this.handleMouseDown);
    this.canvasElement.removeEventListener('mouseup', this.handleMouseUp);
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('keyup', this.handleKeyUp);
  }
}
