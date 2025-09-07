import type { Camera } from './Camera.class';

import type { Canvas } from './Canvas.class';
import { Events } from './events';
import { identityMatrix } from './math';
import { Grid } from './shapes/Grid.class';
import { createProgram } from './utils/createProgram';
import { createShader } from './utils/createShader';
import { tick } from './utils/tick';

const vertexShaderSource = `
  attribute vec2 a_position;

  uniform vec2 u_resolution;
  uniform mat3 u_viewport_transform_matrix;
  uniform mat3 u_object_transformation_matrix;

  void main() {
    vec2 position = (u_viewport_transform_matrix * u_object_transformation_matrix * vec3(a_position, 1)).xy;
    vec2 zeroToOne = position / u_resolution;
    vec2 zeroToTwo = zeroToOne * 2.0;
    vec2 clipSpace = zeroToTwo - 1.0;
    gl_Position = vec4(clipSpace, 0, 1);
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
  grid: Grid;
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
    this.render = this.render.bind(this);

    this.canvas.on(Events.ZOOM_CHANGED, this.onCameraChanged);
    this.canvas.on(Events.PAN_CHANGED, this.onCameraChanged);
    this.canvas.on(Events.RENDER, this.render);
  }

  destroyListeners() {
    this.canvas.off(Events.ZOOM_CHANGED, this.onCameraChanged);
    this.canvas.off(Events.PAN_CHANGED, this.onCameraChanged);
    this.canvas.off(Events.RENDER, this.render);
  }

  onCameraChanged() {
    this.updateCameraUniforms(this.baseProgram.basic2D as WebGLProgram);

    this.render();
  }

  setupGrid() {
    this.grid = new Grid({
      gridSize: 100,
      color: [0.9, 0.9, 0.9, 0.5],
      majorGridSize: 500,
      majorColor: [0.8, 0.8, 0.8, 1],
    });
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

    this.setupGrid();

    tick().then(() => {
      this.render();
    });
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

    this.grid.draw(this.ctx, {
      program: this.baseProgram.basic2D as WebGLProgram,
    });

    const visibleObjects = this.canvas.objects.filter((object) => true || object.isVisible());

    visibleObjects.forEach((object) => {
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
