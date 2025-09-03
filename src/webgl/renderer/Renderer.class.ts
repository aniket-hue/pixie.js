import type { Shape } from '../shapes/types';

class Renderer {
  canvas: HTMLCanvasElement;
  ctx: WebGLRenderingContext;
  objects: Shape[] = [];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const webglCtx = this.canvas.getContext('webgl');

    if (!webglCtx) {
      throw new Error('WebGL not supported');
    }

    this.ctx = webglCtx;

    this.setupWebGL();
  }

  setupWebGL() {
    const gl = this.ctx;

    // Set canvas size to match display size
    this.resizeCanvas();

    // Enable blending for transparency
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Set viewport
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    // Clear canvas with a light background
    this.clear();
  }

  resizeCanvas() {
    const canvas = this.canvas;
    const displayWidth = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;

    // Check if the canvas is not the same size
    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
      // Make the canvas the same size
      canvas.width = displayWidth;
      canvas.height = displayHeight;
    }
  }

  clear(r = 0, g = 0, b = 0, a = 1.0) {
    const gl = this.ctx;
    gl.clearColor(r, g, b, a);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  addObject(object: Shape) {
    this.objects.push(object);
  }

  render() {
    // Clear once
    this.clear();

    // Draw all objects
    this.objects.forEach((object) => {
      object.draw(this.ctx);
    });
  }
}

export default Renderer;
