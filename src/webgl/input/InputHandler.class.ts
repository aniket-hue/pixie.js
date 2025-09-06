import type { Camera } from '../Camera.class';
import { PRIMARY_MODIFIER_KEY } from './constants';

export class InputHandler {
  private canvas: HTMLCanvasElement;
  private camera: Camera;

  constructor(canvas: HTMLCanvasElement, camera: Camera) {
    this.canvas = canvas;
    this.camera = camera;
    this.setupEventListeners();
  }

  private setupEventListeners() {
    // Mouse wheel for zoom
    this.canvas.addEventListener('wheel', this.handleWheel.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));

    // Prevent context menu
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // Set cursor style
    this.canvas.style.cursor = 'default';
  }

  private handleWheel(event: WheelEvent) {
    event.preventDefault();

    if (event[PRIMARY_MODIFIER_KEY]) {
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;

      this.camera.zoomAt(event.deltaY, mouseX, mouseY);
    } else {
      this.camera.pan(event.deltaX, event.deltaY);
    }
  }

  private handleMouseMove(event: MouseEvent) {
    event.preventDefault();
  }

  private handleMouseDown(event: MouseEvent) {
    event.preventDefault();
  }

  private handleMouseUp(event: MouseEvent) {
    event.preventDefault();
  }

  // Cleanup event listeners
  destroy() {
    this.canvas.removeEventListener('wheel', this.handleWheel);
    this.canvas.removeEventListener('contextmenu', (e) => e.preventDefault());
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('mousedown', this.handleMouseDown);
    this.canvas.removeEventListener('mouseup', this.handleMouseUp);
  }
}
