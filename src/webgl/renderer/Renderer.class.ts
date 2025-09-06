import { Camera } from '../camera';
import type { Shape } from '../shapes/types';
import { createProgram } from '../utils/createProgram';
import { createShader } from '../utils/createShader';

const vertexShaderSource = `
  attribute vec2 a_position;

  uniform float a_angle;
  uniform vec2 u_resolution;
  uniform float u_camera_zoom;
  uniform vec2 u_camera_translation;
  uniform vec2 u_object_center;

  void main() {
    // Translate to local coordinates relative to the object's center
    vec2 a_position_by_center = a_position - u_object_center;

    // Apply rotation to local position (correct matrix * vector order)
    mat2 rotation_matrix = mat2(cos(a_angle), sin(a_angle), -sin(a_angle), cos(a_angle));
    vec2 rotated_pos = rotation_matrix * a_position_by_center + u_object_center;
    
    // Transform to world coordinates (apply camera translation)
    vec2 world_pos = rotated_pos - u_camera_translation;
  
    // Scale by camera zoom
    vec2 view_pos = world_pos * u_camera_zoom;
    
    // Convert to screen coordinates
    vec2 screen_pos = view_pos + u_resolution * 0.5;
    
    // Convert to normalized device coordinates (-1 to +1)
    vec2 clip_space = ((screen_pos / u_resolution) * 2.0) - 1.0;
    
    // Flip the y-coordinate
    gl_Position = vec4(clip_space * vec2(1, -1), 0, 1);
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
  baseProgram: Partial<{
    basic2D: WebGLProgram;
  }> = {};

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const webglCtx = this.canvas.getContext('webgl');

    if (!webglCtx) {
      throw new Error('WebGL not supported');
    }

    this.ctx = webglCtx;

    this.setupWebGL();

    this.camera = new Camera(1, this.canvas);
  }

  setupWebGL() {
    const gl = this.ctx;

    const baseVertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const baseFragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    this.baseProgram.basic2D = createProgram(gl, baseVertexShader, baseFragmentShader);

    this.resizeCanvas();

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    this.updateResolutionUniform(this.baseProgram.basic2D as WebGLProgram);

    this.clear();
  }

  resizeCanvas() {
    const canvas = this.canvas;
    const displayWidth = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;

    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
      canvas.width = displayWidth;
      canvas.height = displayHeight;

      this.updateResolutionUniform(this.baseProgram.basic2D as WebGLProgram);

      this.ctx.viewport(0, 0, canvas.width, canvas.height);
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

  updateResolutionUniform(program: WebGLProgram) {
    const gl = this.ctx;

    gl.useProgram(program);
    const resolutionLocation = gl.getUniformLocation(program, 'u_resolution');

    if (resolutionLocation) {
      gl.uniform2f(resolutionLocation, gl.canvas.width, gl.canvas.height);
    }
  }

  updateCameraUniforms(program: WebGLProgram) {
    const gl = this.ctx;

    gl.useProgram(program);

    const cameraZoomLocation = gl.getUniformLocation(program, 'u_camera_zoom');

    if (cameraZoomLocation) {
      gl.uniform1f(cameraZoomLocation, this.camera.zoom);
    }

    const cameraTranslationLocation = gl.getUniformLocation(program, 'u_camera_translation');

    if (cameraTranslationLocation) {
      gl.uniform2f(cameraTranslationLocation, this.camera.x, this.camera.y);
    }
  }

  render() {
    this.clear();

    this.updateCameraUniforms(this.baseProgram.basic2D as WebGLProgram);

    this.objects.forEach((object) => {
      object.draw(this.ctx, {
        program: this.baseProgram.basic2D as WebGLProgram,
      });
    });
  }
}

export default Renderer;
