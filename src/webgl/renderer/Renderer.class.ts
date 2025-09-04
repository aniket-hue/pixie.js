import { Camera } from '../camera';
import type { Shape } from '../shapes/types';
import { createProgram } from '../utils/createProgram';
import { createShader } from '../utils/createShader';

const vertexShaderSource = `
  attribute vec2 a_position;
  uniform vec2 u_resolution;
  
  void main() {
    // Convert from pixels to normalized device coordinates (-1 to +1)
    vec2 clipSpace = ((a_position / u_resolution) * 2.0) - 1.0;
    
    // Flip Y coordinate (WebGL Y goes up, screen Y goes down)
    gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
  }
`;

const fragmentShaderSource = `
  precision mediump float;
  uniform vec4 u_color;
  
  void main() {
    gl_FragColor = u_color;
  }
`;

class Renderer {
  canvas: HTMLCanvasElement;
  ctx: WebGLRenderingContext;
  objects: Shape[] = [];
  camera: Camera;
  baseProgram: {
    basic2D: WebGLProgram | null;
  } = {
    basic2D: null,
  };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const webglCtx = this.canvas.getContext('webgl');
    this.camera = new Camera(0, 0, 1);

    if (!webglCtx) {
      throw new Error('WebGL not supported');
    }

    this.ctx = webglCtx;

    this.setupWebGL();
  }

  setupWebGL() {
    const gl = this.ctx;

    const baseVertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const baseFragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    this.baseProgram.basic2D = createProgram(gl, baseVertexShader, baseFragmentShader);

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
      if (!this.baseProgram.basic2D) {
        throw new Error('Base vertex shader or fragment shader not set');
      }

      object.draw(this.ctx, {
        program: this.baseProgram.basic2D,
      });
    });
  }
}

export default Renderer;
