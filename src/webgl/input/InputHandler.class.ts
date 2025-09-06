import type { Camera } from '../camera/Camera.class';
import { PRIMARY_MODIFIER_KEY } from './constants';

export class InputHandler {
  private canvas: HTMLCanvasElement;
  private camera: Camera;
  private onRender: (() => void) | null = null;

  constructor(canvas: HTMLCanvasElement, camera: Camera, onRender?: () => void) {
    this.canvas = canvas;
    this.camera = camera;
    this.onRender = onRender || null;
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

    const zoomFactor = event.deltaY > 0 ? -0.01 : 0.01;

    if (event[PRIMARY_MODIFIER_KEY]) {
      this.camera.zoomAt(zoomFactor);
    } else {
      this.camera.pan(event.deltaX, event.deltaY);
    }

    // Trigger re-render
    this.onRender?.();
  }

  // Cleanup event listeners
  destroy() {
    this.canvas.removeEventListener('wheel', this.handleWheel);
    this.canvas.removeEventListener('contextmenu', (e) => e.preventDefault());
  }
}
