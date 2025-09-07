import type { Canvas } from '../Canvas.class';
import { m3 } from '../math';
import { Shape } from './Shape.class';
import type { ICircleConstructorData } from './types';

class Circle extends Shape {
  angle: number;
  color: [number, number, number, number];
  center: [number, number];
  radius: number;
  canvas: Canvas;

  transformationMatrix: number[];
  private vertices: Float32Array;

  constructor({ x, y, color, radius, angle = 0, canvas }: ICircleConstructorData) {
    super();

    this.canvas = canvas;
    this.type = 'circle';
    this.angle = angle;
    this.color = color;
    this.center = [x, y];
    this.radius = radius;

    const rotationMatrix = m3.rotation(angle);
    const translationMatrix = m3.translation(x, y);

    this.transformationMatrix = m3.multiply(translationMatrix, rotationMatrix);

    const segments = 32;
    this.vertices = new Float32Array((segments + 2) * 2);

    this.vertices[0] = 0;
    this.vertices[1] = 0;

    for (let i = 0; i <= segments; i++) {
      const angle = (i * 2 * Math.PI) / segments;
      this.vertices[(i + 1) * 2] = Math.cos(angle) * radius;
      this.vertices[(i + 1) * 2 + 1] = Math.sin(angle) * radius;
    }

    console.log(this.getBoundsOnScreen());
  }

  getBoundsOnScreen() {
    const tx = this.viewportTransformMatrix[6];
    const ty = this.viewportTransformMatrix[7];
    const radius = this.radius;

    return {
      tl: this.canvas.worldToScreen(tx - radius, ty - radius),
      tr: this.canvas.worldToScreen(tx + radius, ty - radius),
      bl: this.canvas.worldToScreen(tx - radius, ty + radius),
      br: this.canvas.worldToScreen(tx + radius, ty + radius),
    };
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
    gl.uniformMatrix3fv(transformationMatrixLocation, false, this.transformationMatrix);

    gl.enableVertexAttribArray(positionLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    gl.drawArrays(gl.TRIANGLE_FAN, 0, 34); // 1 center + 32 segments + 1 closing = 34 total
  }
}

export default Circle;
