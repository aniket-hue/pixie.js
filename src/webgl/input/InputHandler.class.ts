import type { Camera } from '../camera/Camera.class';
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

      console.log(mouseX, mouseY, event.clientX, event.clientY);

      this.camera.zoomAt(event.deltaY, mouseX, mouseY);
    } else {
      this.camera.pan(event.deltaX, event.deltaY);
    }
  }

  // Cleanup event listeners
  destroy() {
    this.canvas.removeEventListener('wheel', this.handleWheel);
    this.canvas.removeEventListener('contextmenu', (e) => e.preventDefault());
  }
}
