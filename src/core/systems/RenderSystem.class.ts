import type { Camera } from '../Camera.class';
import type { Object } from '../entities/Object.class';
import type { ICameraTarget, IRenderTarget } from '../interfaces';
import type { GlCore } from '../webgl/GlCore.class';
import type { Size, Style } from '../world/types';

export class RenderSystem {
  private gl: GlCore;

  private rectangleVertices: Float32Array;
  private circleVertices: Float32Array;
  private rectangleOutlineVertices: Float32Array;

  private rectangleBuffer: WebGLBuffer | null;
  private rectangleOutlineBuffer: WebGLBuffer | null;
  private circleBuffer: WebGLBuffer | null;

  private positionLocation: number | null;

  private camera: Camera;

  constructor(context: IRenderTarget & ICameraTarget & { getGlCore(): GlCore }) {
    this.gl = context.getGlCore();
    this.camera = context.camera;

    // Define geometry data
    this.rectangleVertices = new Float32Array([-0.5, -0.5, 0.5, -0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5]);

    this.rectangleOutlineVertices = new Float32Array([-0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5]);

    const segments = 32;
    this.circleVertices = new Float32Array((segments + 2) * 2);
    this.circleVertices[0] = 0;
    this.circleVertices[1] = 0;

    for (let i = 0; i <= segments; i++) {
      const angle = (i * 2 * Math.PI) / segments;
      this.circleVertices[(i + 1) * 2] = Math.cos(angle);
      this.circleVertices[(i + 1) * 2 + 1] = Math.sin(angle);
    }

    // Create buffers once
    this.rectangleBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ctx.ARRAY_BUFFER, this.rectangleBuffer);
    this.gl.bufferData(this.gl.ctx.ARRAY_BUFFER, this.rectangleVertices, this.gl.ctx.STATIC_DRAW);

    this.rectangleOutlineBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ctx.ARRAY_BUFFER, this.rectangleOutlineBuffer);
    this.gl.bufferData(this.gl.ctx.ARRAY_BUFFER, this.rectangleOutlineVertices, this.gl.ctx.STATIC_DRAW);

    this.circleBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ctx.ARRAY_BUFFER, this.circleBuffer);
    this.gl.bufferData(this.gl.ctx.ARRAY_BUFFER, this.circleVertices, this.gl.ctx.STATIC_DRAW);

    this.positionLocation = this.gl.getAttribLocation('basic2DProgram', 'a_position');
  }

  private updateViewporAndResolution() {
    const gl = this.gl;

    const resolutionLocation = gl.getUniformLocation('basic2DProgram', 'u_resolution');
    const cameraViewportTransformLocation = gl.getUniformLocation('basic2DProgram', 'u_viewport_transform_matrix');

    if (resolutionLocation) {
      gl.setUniform2f('basic2DProgram', 'u_resolution', [gl.width, gl.height]);
    }

    if (cameraViewportTransformLocation) {
      gl.setUniformMatrix3fv('basic2DProgram', 'u_viewport_transform_matrix', this.camera.viewportTransformMatrix);
    }
  }

  private updateRectangles(objects: Object[]) {
    const gl = this.gl;
    const positionLocation = this.positionLocation;
    const rectangleBuffer = this.rectangleBuffer;

    if (typeof positionLocation !== 'number' || !rectangleBuffer) {
      return;
    }

    gl.bindBuffer(gl.ctx.ARRAY_BUFFER, rectangleBuffer);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.ctx.FLOAT, false, 0, 0);

    for (const { style, transform, size, selected } of objects) {
      gl.setUniform1i('basic2DProgram', 'u_selected', selected ? 1 : 0);
      gl.setUniform1f('basic2DProgram', 'u_stroke_width', style.strokeWidth);
      gl.setUniform4f('basic2DProgram', 'u_stroke_color', style.stroke);
      gl.setUniform4f('basic2DProgram', 'u_fill_color', style.fill);
      gl.setUniformMatrix3fv('basic2DProgram', 'u_object_transformation_matrix', transform.worldMatrix);
      gl.setUniform2f('basic2DProgram', 'u_size', [size.width!, size.height!]);
      gl.drawArrays(gl.ctx.TRIANGLES, 0, 6);
    }
  }

  private updateCircles(objects: Object[]) {
    const gl = this.gl;
    const positionLocation = this.positionLocation;
    const circleBuffer = this.circleBuffer;

    if (!positionLocation || !circleBuffer) {
      return;
    }

    gl.bindBuffer(gl.ctx.ARRAY_BUFFER, circleBuffer);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.ctx.FLOAT, false, 0, 0);

    for (const { style, transform, size } of objects) {
      gl.setUniform4f('basic2DProgram', 'u_fill_color', style.fill);
      gl.setUniformMatrix3fv('basic2DProgram', 'u_object_transformation_matrix', transform.localMatrix);
      gl.setUniform2f('basic2DProgram', 'u_size', [size.radius!, size.radius!]);
      gl.drawArrays(gl.ctx.TRIANGLE_FAN, 0, this.circleVertices.length / 2);
    }
  }

  update(objects: Object[]) {
    this.gl.clear();

    this.updateViewporAndResolution();

    const rectangles: Array<Object> = [];
    const circles: Array<Object> = [];

    for (const object of objects) {
      const size = object.size;

      if (size.radius) {
        circles.push(object);
      } else {
        rectangles.push(object);
      }
    }

    // ---- Rectangles ----
    if (rectangles.length > 0) {
      this.updateRectangles(rectangles);
    }

    // ---- Circles ----
    if (circles.length > 0) {
      this.updateCircles(circles);
    }
  }
}
