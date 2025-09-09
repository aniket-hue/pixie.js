import type { Camera } from '../Camera.class';
import type { Canvas } from '../Canvas.class';
import type { Size, Style } from '../factory/types';
import { createProgram } from '../utils/createProgram';
import { createShader } from '../utils/createShader';
import { tick } from '../utils/tick';

const vss = `
    attribute vec2 a_position;
    uniform vec2 u_resolution;
    uniform mat3 u_viewport_transform_matrix;
    uniform mat3 u_object_transformation_matrix;
    uniform vec2 u_size; 


    void main() {
        vec2 position = (u_viewport_transform_matrix * u_object_transformation_matrix * vec3(a_position * u_size, 1)).xy;
        vec2 zeroToOne = position / u_resolution;
        vec2 zeroToTwo = zeroToOne * 2.0;
        vec2 clipSpace = zeroToTwo - 1.0;
        gl_Position = vec4(clipSpace, 0, 1);
    }
`;

const fss = `
    precision mediump float;
    uniform vec4 u_color;
    
    void main() {
        gl_FragColor = u_color;
    }
`;

export class RenderSystem {
  private program: WebGLProgram;
  private gl: WebGLRenderingContext;

  private vertexShaderSource: string;
  private fragmentShaderSource: string;

  private rectangleVertices: Float32Array;
  private circleVertices: Float32Array;
  private camera: Camera;
  private canvas: Canvas;

  constructor(canvas: Canvas) {
    this.canvas = canvas;
    this.gl = canvas.getCtx()!;
    this.camera = canvas.camera;

    this.vertexShaderSource = vss;
    this.fragmentShaderSource = fss;

    const vertexShader = createShader(this.gl, this.gl.VERTEX_SHADER, this.vertexShaderSource);
    const fragmentShader = createShader(this.gl, this.gl.FRAGMENT_SHADER, this.fragmentShaderSource);
    this.program = createProgram(this.gl, vertexShader, fragmentShader);
    this.gl.useProgram(this.program);

    this.gl.enable(this.gl.BLEND);
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

    this.rectangleVertices = new Float32Array([
      -0.5, -0.5, 0.5, -0.5, -0.5, 0.5,
      // Second triangle
      -0.5, 0.5, 0.5, -0.5, 0.5, 0.5,
    ]);

    const segments = 32;
    this.circleVertices = new Float32Array((segments + 2) * 2);
    this.circleVertices[0] = 0;
    this.circleVertices[1] = 0;

    for (let i = 0; i <= segments; i++) {
      const angle = (i * 2 * Math.PI) / segments;
      this.circleVertices[(i + 1) * 2] = Math.cos(angle);
      this.circleVertices[(i + 1) * 2 + 1] = Math.sin(angle);
    }

    tick().then(() => {
      this.update();
    });
  }

  update() {
    const gl = this.gl;
    const program = this.program;

    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const resolutionLocation = gl.getUniformLocation(program, 'u_resolution');
    const cameraViewportTransformLocation = gl.getUniformLocation(program, 'u_viewport_transform_matrix');

    if (resolutionLocation) {
      gl.uniform2f(resolutionLocation, gl.canvas.width, gl.canvas.height);
    }

    if (cameraViewportTransformLocation) {
      gl.uniformMatrix3fv(cameraViewportTransformLocation, false, this.camera.viewportTransformMatrix);
    }

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.rectangleVertices, gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, 'a_position');
    const colorLocation = gl.getUniformLocation(program, 'u_color');
    const transformationMatrixLocation = gl.getUniformLocation(program, 'u_object_transformation_matrix');
    const sizeLocation = gl.getUniformLocation(program, 'u_size');

    const rectangles: Array<{ style: Style; matrix: number[]; size: Size }> = [];
    const circles: Array<{ style: Style; matrix: number[]; size: Size }> = [];

    for (const object of this.canvas.objects) {
      const style = object.style;
      const size = object.size;
      const matrix = object.transformMatrix;

      if (size.radius) {
        circles.push({ style, matrix, size });
      } else {
        rectangles.push({ style, matrix, size });
      }
    }

    if (rectangles.length > 0) {
      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

      for (const { style, matrix, size } of rectangles) {
        gl.uniform4f(colorLocation, style.fill[0], style.fill[1], style.fill[2], style.fill[3]);
        gl.uniformMatrix3fv(transformationMatrixLocation, false, matrix);
        gl.uniform2f(sizeLocation, size.width!, size.height!);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }
    }

    if (circles.length > 0) {
      gl.bufferData(gl.ARRAY_BUFFER, this.circleVertices, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

      for (const { style, matrix, size } of circles) {
        gl.uniform4f(colorLocation, style.fill[0], style.fill[1], style.fill[2], style.fill[3]);
        gl.uniformMatrix3fv(transformationMatrixLocation, false, matrix);
        gl.uniform2f(sizeLocation, size.radius!, size.radius!);
        gl.drawArrays(gl.TRIANGLE_FAN, 0, 34);
      }
    }

    gl.deleteBuffer(positionBuffer);
  }
}
