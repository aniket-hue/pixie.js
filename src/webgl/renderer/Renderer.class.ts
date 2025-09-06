import { Camera } from '../camera';
import { identityMatrix } from '../math';
import type { Shape } from '../shapes/types';
import { createProgram } from '../utils/createProgram';
import { createShader } from '../utils/createShader';

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

    this.camera = new Camera(
      {
        zoom: 1,
        x: 0,
        y: 0,
      },
      this.canvas,
    );
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
