import type { Camera } from '../../Camera.class';
import { m3 } from '../../math';
import { createProgram } from '../../utils/createProgram';
import { createShader } from '../../utils/createShader';
import { tick } from '../../utils/tick';
import type { Bounds, Parent, Size, Style, Transform } from '../components/types';
import type { World } from '../World.class';

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
  private gl: WebGLRenderingContext;
  program: WebGLProgram;
  private vertexShaderSource: string;
  private fragmentShaderSource: string;
  private rectangleVertices: Float32Array;
  private circleVertices: Float32Array;
  private world: World;
  private camera: Camera;

  constructor(gl: WebGLRenderingContext, world: World, camera: Camera) {
    this.world = world;
    this.gl = gl;
    this.camera = camera;

    this.vertexShaderSource = vss;
    this.fragmentShaderSource = fss;

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, this.vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, this.fragmentShaderSource);
    this.program = createProgram(gl, vertexShader, fragmentShader);

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
    const world = this.world;

    gl.useProgram(program);

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

    const transformStore = world.store<Transform>('transform');
    const sizeStore = world.store<Size>('size');
    const styleStore = world.store<Style>('style');
    const boundsStore = world.store<Bounds>('bounds');
    const parentStore = world.store<Parent>('parent');

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.rectangleVertices, gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, 'a_position');
    const colorLocation = gl.getUniformLocation(program, 'u_color');
    const transformationMatrixLocation = gl.getUniformLocation(program, 'u_object_transformation_matrix');
    const sizeLocation = gl.getUniformLocation(program, 'u_size');

    const rectangles: Array<{ transform: Transform; style: Style; matrix: number[]; size: Size }> = [];
    const circles: Array<{ transform: Transform; style: Style; matrix: number[]; size: Size }> = [];

    for (const [entity, t] of transformStore.entries()) {
      const bounds = boundsStore.get(entity);
      const size = sizeStore.get(entity);
      const style = styleStore.get(entity);

      if (!size || !style || !bounds) {
        continue;
      }

      const matrix = bounds.matrix;

      if (size.radius) {
        circles.push({ transform: t, style, matrix, size });
      } else {
        rectangles.push({ transform: t, style, matrix, size });
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
        gl.drawArrays(gl.TRIANGLE_FAN, 0, 34); // 32 segments + center + closing vertex
      }
    }

    gl.deleteBuffer(positionBuffer);
  }
}
