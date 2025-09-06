import { flipCoordinatesToWorldSpace, m3 } from '../math';
import type { Shape } from './types';

class Rectangle implements Shape {
  angle: number;
  color: [number, number, number, number];
  center: [number, number];
  width: number;
  height: number;
  scaleX: number;
  scaleY: number;

  transformationMatrix: number[];
  private vertices: Float32Array;

  constructor({
    x,
    y,
    width,
    height,
    color,
    angle = 0,
    scaleX = 1,
    scaleY = 1,
  }: {
    x: number;
    y: number;
    width: number;
    height: number;
    color: [number, number, number, number];
    angle?: number;
    scaleX?: number;
    scaleY?: number;
  }) {
    const center = flipCoordinatesToWorldSpace(x, y);

    this.angle = angle;
    this.center = [center.x, center.y];
    this.scaleX = scaleX;
    this.scaleY = scaleY;
    this.width = width;
    this.height = height;

    const scale = m3.scaling(scaleX * width, scaleY * height);
    const rotation = m3.rotation(angle);
    const combined = m3.multiply(rotation, scale);
    const translation = m3.translation(center.x, center.y);
    this.transformationMatrix = m3.multiply(translation, combined);

    this.vertices = new Float32Array([-0.5, -0.5, 0.5, -0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5]);

    this.color = color;
  }

  getVertices() {
    return this.vertices;
  }

  rotate(angle: number) {
    this.angle += angle;
  }

  draw(
    gl: WebGLRenderingContext,
    {
      program,
    }: {
      program: WebGLProgram;
    },
  ) {
    const positionBuffer = gl.createBuffer();

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.vertices, gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, 'a_position');
    const colorLocation = gl.getUniformLocation(program, 'u_color');
    const transformationMatrixLocation = gl.getUniformLocation(program, 'u_object_transformation_matrix');

    gl.uniform4f(colorLocation, this.color[0], this.color[1], this.color[2], this.color[3]);

    gl.enableVertexAttribArray(positionLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    gl.uniformMatrix3fv(transformationMatrixLocation, false, this.transformationMatrix);

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    gl.deleteBuffer(positionBuffer);
  }
}

export default Rectangle;
