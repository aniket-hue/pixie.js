import type { Camera } from '../Camera.class';
import type { Object } from '../entities/Object.class';
import type { Size, Style } from '../factory/types';
import type { ICameraTarget, IRenderTarget } from '../interfaces';
import type { GlCore } from '../webgl/GlCore.class';

export class RenderSystem {
  private gl: GlCore;

  private rectangleVertices: Float32Array;
  private circleVertices: Float32Array;
  private camera: Camera;

  constructor(context: IRenderTarget & ICameraTarget & { getGlCore(): GlCore }) {
    this.gl = context.getGlCore();
    this.camera = context.camera;

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
  }

  update(objects: Object[]) {
    const gl = this.gl;

    gl.clear();

    const resolutionLocation = gl.getUniformLocation('basic2DProgram', 'u_resolution');
    const cameraViewportTransformLocation = gl.getUniformLocation('basic2DProgram', 'u_viewport_transform_matrix');

    if (resolutionLocation) {
      gl.setUniform2f('basic2DProgram', 'u_resolution', [gl.width, gl.height]);
    }

    if (cameraViewportTransformLocation) {
      gl.setUniformMatrix3fv('basic2DProgram', 'u_viewport_transform_matrix', this.camera.viewportTransformMatrix);
    }

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ctx.ARRAY_BUFFER, positionBuffer);

    const positionLocation = gl.getAttribLocation('basic2DProgram', 'a_position');

    const rectangles: Array<{ style: Style; matrix: number[]; size: Size }> = [];
    const circles: Array<{ style: Style; matrix: number[]; size: Size }> = [];

    for (const object of objects) {
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
      gl.bufferData(gl.ctx.ARRAY_BUFFER, this.rectangleVertices, gl.ctx.STATIC_DRAW);
      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 2, gl.ctx.FLOAT, false, 0, 0);

      for (const { style, matrix, size } of rectangles) {
        gl.setUniform4f('basic2DProgram', 'u_color', style.fill);
        gl.setUniformMatrix3fv('basic2DProgram', 'u_object_transformation_matrix', matrix);
        gl.setUniform2f('basic2DProgram', 'u_size', [size.width!, size.height!]);
        gl.drawArrays(gl.ctx.TRIANGLES, 0, 6);
      }
    }

    if (circles.length > 0) {
      gl.bufferData(gl.ctx.ARRAY_BUFFER, this.circleVertices, gl.ctx.STATIC_DRAW);
      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 2, gl.ctx.FLOAT, false, 0, 0);

      for (const { style, matrix, size } of circles) {
        gl.setUniform4f('basic2DProgram', 'u_color', style.fill);
        gl.setUniformMatrix3fv('basic2DProgram', 'u_object_transformation_matrix', matrix);
        gl.setUniform2f('basic2DProgram', 'u_size', [size.radius!, size.radius!]);
        gl.drawArrays(gl.ctx.TRIANGLE_FAN, 0, 34);
      }
    }

    gl.deleteBuffer(positionBuffer);
  }
}
