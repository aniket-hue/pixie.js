import { createProgram } from '../utils/createProgram';
import { createShader } from '../utils/createShader';
import type { Shape } from './types';

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
    this.vertices = new Float32Array([
      //First triangle
      x,
      y,

      x + width,
      y,

      x,
      y + height,

      // Second triangle
      x,
      y + height,

      x + width,
      y,

      x + width,
      y + height,
    ]);
    this.color = color;
  }

  getVertices() {
    return this.vertices;
  }

  draw(gl: WebGLRenderingContext) {
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    const program = createProgram(gl, vertexShader, fragmentShader);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.vertices, gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, 'a_position');
    const resolutionLocation = gl.getUniformLocation(program, 'u_resolution');
    const colorLocation = gl.getUniformLocation(program, 'u_color');

    gl.useProgram(program);

    // Set the resolution uniform (canvas size)
    gl.uniform2f(resolutionLocation, gl.canvas.width, gl.canvas.height);

    // Set the color uniform
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

    // Draw triangles (don't clear here - that should be done by the renderer)
    gl.drawArrays(gl.TRIANGLES, 0, 6); // 6 vertices → 2 triangles
  }
}

export default Rectangle;
