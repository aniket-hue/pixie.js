import type { Canvas } from '../Canvas.class';
import { flipCoordinatesToWorldSpace, m3 } from '../math';
import { Shape } from './Shape.class';
import type { IRectangleConstructorData, IShapeDrawParams } from './types';

class Rectangle extends Shape {
  angle: number;
  color: [number, number, number, number];
  center: [number, number];
  width: number;
  height: number;
  canvas: Canvas;
  scaleX: number;
  scaleY: number;
  type: 'rectangle';

  transformationMatrix: number[];
  private vertices: Float32Array;

  constructor({ x, y, width, height, color, angle = 0, scaleX = 1, scaleY = 1, canvas }: IRectangleConstructorData) {
    super();

    this.canvas = canvas;
    this.type = 'rectangle';

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
    console.log(this.getBoundsOnScreen());
    this.color = color;
  }

  getVertices() {
    return this.vertices;
  }

  getBoundsOnScreen() {
    const tx = this.viewportTransformMatrix[6];
    const ty = this.viewportTransformMatrix[7];

    const width = this.width * this.scaleX;
    const height = this.height * this.scaleY;

    const tlW = this.canvas.worldToScreen(tx - width / 2, ty - height / 2);
    const trW = this.canvas.worldToScreen(tx + width / 2, ty - height / 2);
    const blW = this.canvas.worldToScreen(tx - width / 2, ty + height / 2);
    const brW = this.canvas.worldToScreen(tx + width / 2, ty + height / 2);

    return {
      tl: tlW,
      tr: trW,
      bl: blW,
      br: brW,
    };
  }

  isVisible(): boolean {
    if (!this.canvas) {
      return true;
    }

    const bounds = this.getBoundsOnScreen();

    const isInXBounds = (x: number) => x > 0 && x < this.canvas.width;
    const isInYBounds = (y: number) => y > 0 && y < this.canvas.height;
    const isInBounds = (x: number, y: number) => isInXBounds(x) && isInYBounds(y);

    return (
      isInBounds(bounds.tl.x, bounds.tl.y) ||
      isInBounds(bounds.tr.x, bounds.tr.y) ||
      isInBounds(bounds.bl.x, bounds.bl.y) ||
      isInBounds(bounds.br.x, bounds.br.y)
    );
  }

  rotate(angle: number) {
    this.angle += angle;
  }

  draw(gl: WebGLRenderingContext, data: IShapeDrawParams) {
    const { program } = data;
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
