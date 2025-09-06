import { Camera } from './Camera.class';
import type { Canvas } from './Canvas.class';
import { Events } from './events';
import { identityMatrix } from './math';
import { createProgram } from './utils/createProgram';
import { createShader } from './utils/createShader';

const vertexShaderSource = `
  attribute vec2 a_position;

  uniform vec2 u_resolution;
  uniform mat3 u_viewport_transform_matrix;
  uniform mat3 u_object_transformation_matrix;

  void main() {
    vec2 position = (u_viewport_transform_matrix * u_object_transformation_matrix * vec3(a_position, 1)).xy;
    vec2 zeroToOne = position / u_resolution + 0.5;
    vec2 zeroToTwo = zeroToOne * 2.0;
    vec2 clipSpace = zeroToTwo - 1.0;
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

export class Renderer {
  canvas: Canvas;
  ctx: WebGLRenderingContext;
  camera: Camera;
  baseProgram: Partial<{
    basic2D: WebGLProgram;
  }> = {};

  constructor(canvas: Canvas, camera: Camera) {
    this.canvas = canvas;
    const webglCtx = this.canvas.getCtx();

    if (!webglCtx) {
      throw new Error('WebGL not supported');
    }

    this.ctx = webglCtx;
    this.camera = camera;

    this.setupBaseProgram();

    this.initListeners();
  }

  initListeners() {
    this.onCameraChanged = this.onCameraChanged.bind(this);
    this.canvas.on(Events.ZOOM_CHANGED, this.onCameraChanged);
    this.canvas.on(Events.PAN_CHANGED, this.onCameraChanged);
  }

  destroyListeners() {
    this.canvas.off(Events.ZOOM_CHANGED, this.onCameraChanged);
    this.canvas.off(Events.PAN_CHANGED, this.onCameraChanged);
  }

  onCameraChanged() {
    this.updateCameraUniforms(this.baseProgram.basic2D as WebGLProgram);
  }

  setupBaseProgram() {
    const gl = this.ctx;

    const baseVertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const baseFragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    this.baseProgram.basic2D = createProgram(gl, baseVertexShader, baseFragmentShader);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    gl.viewport(0, 0, this.canvas.width, this.canvas.height);

    this.updateResolutionUniform(this.baseProgram.basic2D as WebGLProgram);
    this.updateCameraUniforms(this.baseProgram.basic2D as WebGLProgram);

    this.canvas.clear();
  }

  updateResolutionUniform(program: WebGLProgram) {
    const gl = this.ctx;
    gl.useProgram(program);

    const resolutionLocation = gl.getUniformLocation(program, 'u_resolution');

    if (resolutionLocation) {
      gl.uniform2f(resolutionLocation, this.canvas.width, this.canvas.height);
    }
  }

  updateCameraUniforms(program: WebGLProgram) {
    const gl = this.ctx;
    gl.useProgram(program);

    const cameraViewportTransformLocation = gl.getUniformLocation(program, 'u_viewport_transform_matrix');
    const cameraObjectTransformationLocation = gl.getUniformLocation(program, 'u_object_transformation_matrix');

    if (cameraViewportTransformLocation) {
      gl.uniformMatrix3fv(cameraViewportTransformLocation, false, this.camera.viewportTransformMatrix);
    }

    if (cameraObjectTransformationLocation) {
      gl.uniformMatrix3fv(cameraObjectTransformationLocation, false, identityMatrix);
    }
  }

  render() {
    this.canvas.clear();

    this.canvas.objects.forEach((object) => {
      object.draw(this.ctx, {
        program: this.baseProgram.basic2D as WebGLProgram,
      });
    });
  }

  destroy() {
    this.destroyListeners();
    this.baseProgram = {};
  }
}
