import { flipCoordinatesToWorldSpace } from '../math';
import type { Shape } from './types';

class Rectangle implements Shape {
  vertices: Float32Array;
  color: [number, number, number, number];

  constructor({
    x,
    y,
    width,
    height,
    color,
  }: {
    x: number;
    y: number;
    width: number;
    height: number;
    color: [number, number, number, number];
  }) {
    const flipped = flipCoordinatesToWorldSpace(x, y);

    const centerX = flipped.x - width / 2;
    const centerY = flipped.y - height / 2;

    this.vertices = new Float32Array([
      //First triangle
      centerX,
      centerY,

      centerX + width,
      centerY,

      centerX,
      centerY + height,

      // Second triangle
      centerX,
      centerY + height,

      centerX + width,
      centerY,

      centerX + width,
      centerY + height,
    ]);
    this.color = color;
  }

  getVertices() {
    return this.vertices;
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

    // Program is already active and camera/resolution uniforms are already set by renderer
    // Just set the color uniform specific to this rectangle
    gl.uniform4f(colorLocation, this.color[0], this.color[1], this.color[2], this.color[3]);

    gl.enableVertexAttribArray(positionLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(
      positionLocation,
      2, // 2 components per vertex (x, y)
      gl.FLOAT, // data type
      false, // don't normalize
      0, // stride (0 = move forward size of each vertex)
      0, // offset (start at beginning)
    );

    // Draw triangles
    gl.drawArrays(gl.TRIANGLES, 0, 6); // 6 vertices → 2 triangles

    // Clean up
    gl.deleteBuffer(positionBuffer);
  }
}

export default Rectangle;
