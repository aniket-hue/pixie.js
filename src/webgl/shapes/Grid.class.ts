import { identityMatrix } from '../math';
import { Shape } from './Shape.class';

export class Grid {
  private gridSize: number;
  private color: [number, number, number, number];
  private majorGridSize: number;
  private majorColor: [number, number, number, number];

  constructor({
    gridSize = 100,
    color = [0.85, 0.85, 0.85, 1],
    majorGridSize = 500,
    majorColor = [0.7, 0.7, 0.7, 1],
  }: {
    gridSize?: number;
    color?: [number, number, number, number];
    majorGridSize?: number;
    majorColor?: [number, number, number, number];
  } = {}) {
    this.gridSize = gridSize;
    this.color = color;
    this.majorGridSize = majorGridSize;
    this.majorColor = majorColor;
  }

  draw(gl: WebGLRenderingContext, { program }: { program: WebGLProgram }) {
    // Get camera info from uniforms (we'll need the view bounds)
    // For now, we'll draw a large grid that covers most reasonable zoom levels
    const extent = 10000; // Large enough for most use cases

    // Create grid lines
    const vertices: number[] = [];

    // Vertical lines
    for (let x = -extent; x <= extent; x += this.gridSize) {
      vertices.push(x, -extent, x, extent);
    }

    // Horizontal lines
    for (let y = -extent; y <= extent; y += this.gridSize) {
      vertices.push(-extent, y, extent, y);
    }

    // Major grid lines (every 5th line)
    const majorVertices: number[] = [];

    // Major vertical lines
    for (let x = -extent; x <= extent; x += this.majorGridSize) {
      majorVertices.push(x, -extent, x, extent);
    }

    // Major horizontal lines
    for (let y = -extent; y <= extent; y += this.majorGridSize) {
      majorVertices.push(-extent, y, extent, y);
    }

    const positionBuffer = gl.createBuffer();
    const positionLocation = gl.getAttribLocation(program, 'a_position');
    const colorLocation = gl.getUniformLocation(program, 'u_color');
    const transformationMatrixLocation = gl.getUniformLocation(program, 'u_object_transformation_matrix');

    // Draw minor grid lines
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    gl.uniform4f(colorLocation, this.color[0], this.color[1], this.color[2], this.color[3]);
    gl.drawArrays(gl.LINES, 0, vertices.length / 2);

    // Draw major grid lines
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(majorVertices), gl.STATIC_DRAW);
    gl.uniform4f(colorLocation, this.majorColor[0], this.majorColor[1], this.majorColor[2], this.majorColor[3]);

    gl.drawArrays(gl.LINES, 0, majorVertices.length / 2);
    gl.uniformMatrix3fv(transformationMatrixLocation, false, identityMatrix);

    // Clean up
    gl.deleteBuffer(positionBuffer);
  }

  // Grid doesn't need specific vertices since it's procedural
  getVertices(): Float32Array {
    return new Float32Array();
  }
}
