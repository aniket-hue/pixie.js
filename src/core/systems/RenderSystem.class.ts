import type { Camera } from '../Camera.class';
import type { Object } from '../entities/Object.class';
import type { ICameraTarget, IRenderTarget } from '../interfaces';
import type { GlCore } from '../webgl/GlCore.class';

export class RenderSystem {
  private gl: GlCore;

  private rectangleVertices: Float32Array;
  private circleVertices: Float32Array;
  private rectangleOutlineVertices: Float32Array;

  private rectangleBuffer: WebGLBuffer | null = null;
  private rectangleOutlineBuffer: WebGLBuffer | null = null;
  private circleBuffer: WebGLBuffer | null = null;

  private instanceMatrixBuffer: WebGLBuffer | null = null;
  private instanceSizeBuffer: WebGLBuffer | null = null;
  private instanceFillColorBuffer: WebGLBuffer | null = null;
  private instanceStrokeColorBuffer: WebGLBuffer | null = null;
  private instanceStrokeWidthBuffer: WebGLBuffer | null = null;
  private instanceSelectedBuffer: WebGLBuffer | null = null;

  private maxInstances = 20_000;
  private instanceMatrixData: Float32Array;
  private instanceSizeData: Float32Array;
  private instanceFillColorData: Float32Array;
  private instanceStrokeColorData: Float32Array;
  private instanceStrokeWidthData: Float32Array;
  private instanceSelectedData: Float32Array;

  private positionLocation: number | null = null;

  // Instance attribute locations
  private instanceMatrixLocation: number | null = null;
  private instanceSizeLocation: number | null = null;
  private instanceFillColorLocation: number | null = null;
  private instanceStrokeColorLocation: number | null = null;
  private instanceStrokeWidthLocation: number | null = null;
  private instanceSelectedLocation: number | null = null;

  private camera: Camera;

  constructor(context: IRenderTarget & ICameraTarget & { getGlCore(): GlCore }) {
    this.gl = context.getGlCore();
    this.camera = context.camera;

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

    this.instanceMatrixData = new Float32Array(this.maxInstances * 9); // 3x3 matrices
    this.instanceSizeData = new Float32Array(this.maxInstances * 2); // width, height
    this.instanceFillColorData = new Float32Array(this.maxInstances * 4); // r, g, b, a
    this.instanceStrokeColorData = new Float32Array(this.maxInstances * 4); // r, g, b, a
    this.instanceStrokeWidthData = new Float32Array(this.maxInstances); // stroke width
    this.instanceSelectedData = new Float32Array(this.maxInstances); // selected flag

    this.initBuffers();
    this.initAttributeLocations();
  }

  private initBuffers() {
    const gl = this.gl;

    // Create vertex geometry buffers
    this.rectangleBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ctx.ARRAY_BUFFER, this.rectangleBuffer);
    gl.bufferData(gl.ctx.ARRAY_BUFFER, this.rectangleVertices, gl.ctx.STATIC_DRAW);

    this.rectangleOutlineBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ctx.ARRAY_BUFFER, this.rectangleOutlineBuffer);
    gl.bufferData(gl.ctx.ARRAY_BUFFER, this.rectangleOutlineVertices, gl.ctx.STATIC_DRAW);

    this.circleBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ctx.ARRAY_BUFFER, this.circleBuffer);
    gl.bufferData(gl.ctx.ARRAY_BUFFER, this.circleVertices, gl.ctx.STATIC_DRAW);

    // Create instance data buffers
    this.instanceMatrixBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ctx.ARRAY_BUFFER, this.instanceMatrixBuffer);
    gl.bufferData(gl.ctx.ARRAY_BUFFER, this.instanceMatrixData, gl.ctx.DYNAMIC_DRAW);

    this.instanceSizeBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ctx.ARRAY_BUFFER, this.instanceSizeBuffer);
    gl.bufferData(gl.ctx.ARRAY_BUFFER, this.instanceSizeData, gl.ctx.DYNAMIC_DRAW);

    this.instanceFillColorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ctx.ARRAY_BUFFER, this.instanceFillColorBuffer);
    gl.bufferData(gl.ctx.ARRAY_BUFFER, this.instanceFillColorData, gl.ctx.DYNAMIC_DRAW);

    this.instanceStrokeColorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ctx.ARRAY_BUFFER, this.instanceStrokeColorBuffer);
    gl.bufferData(gl.ctx.ARRAY_BUFFER, this.instanceStrokeColorData, gl.ctx.DYNAMIC_DRAW);

    this.instanceStrokeWidthBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ctx.ARRAY_BUFFER, this.instanceStrokeWidthBuffer);
    gl.bufferData(gl.ctx.ARRAY_BUFFER, this.instanceStrokeWidthData, gl.ctx.DYNAMIC_DRAW);

    this.instanceSelectedBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ctx.ARRAY_BUFFER, this.instanceSelectedBuffer);
    gl.bufferData(gl.ctx.ARRAY_BUFFER, this.instanceSelectedData, gl.ctx.DYNAMIC_DRAW);
  }

  private initAttributeLocations() {
    const gl = this.gl;

    // Get attribute locations
    this.positionLocation = gl.getAttribLocation('basic2DProgram', 'a_position');
    this.instanceMatrixLocation = gl.getAttribLocation('basic2DProgram', 'a_instance_matrix');
    this.instanceSizeLocation = gl.getAttribLocation('basic2DProgram', 'a_instance_size');
    this.instanceFillColorLocation = gl.getAttribLocation('basic2DProgram', 'a_instance_fill_color');
    this.instanceStrokeColorLocation = gl.getAttribLocation('basic2DProgram', 'a_instance_stroke_color');
    this.instanceStrokeWidthLocation = gl.getAttribLocation('basic2DProgram', 'a_instance_stroke_width');
    this.instanceSelectedLocation = gl.getAttribLocation('basic2DProgram', 'a_instance_selected');
  }

  private updateViewportAndResolution() {
    const gl = this.gl;

    const resolutionLocation = gl.getUniformLocation('basic2DProgram', 'u_resolution');
    const cameraViewportTransformLocation = gl.getUniformLocation('basic2DProgram', 'u_viewport_transform_matrix');

    if (resolutionLocation) {
      gl.setUniform2f('basic2DProgram', 'u_resolution', [gl.width, gl.height]);
    }

    if (cameraViewportTransformLocation) {
      gl.setUniformMatrix3fv('basic2DProgram', 'u_viewport_transform_matrix', this.camera.viewportTransformMatrix);
    }

    gl.setUniform1f('basic2DProgram', 'u_zoom_level', this.camera.zoom);
  }

  private setupInstancedAttributes() {
    const gl = this.gl;

    if (typeof this.positionLocation === 'number' && this.rectangleBuffer) {
      gl.bindBuffer(gl.ctx.ARRAY_BUFFER, this.rectangleBuffer);
      gl.enableVertexAttribArray(this.positionLocation);
      gl.vertexAttribPointer(this.positionLocation, 2, gl.ctx.FLOAT, false, 0, 0);
      gl.vertexAttribDivisor(this.positionLocation, 0); // Per vertex
    }

    if (typeof this.instanceMatrixLocation === 'number' && this.instanceMatrixBuffer) {
      gl.bindBuffer(gl.ctx.ARRAY_BUFFER, this.instanceMatrixBuffer);

      for (let i = 0; i < 3; i++) {
        const loc = this.instanceMatrixLocation + i;
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, 3, gl.ctx.FLOAT, false, 9 * 4, i * 3 * 4); // 9 floats per matrix, 3 floats per row
        gl.vertexAttribDivisor(loc, 1);
      }
    }

    if (typeof this.instanceSizeLocation === 'number' && this.instanceSizeBuffer) {
      gl.bindBuffer(gl.ctx.ARRAY_BUFFER, this.instanceSizeBuffer);
      gl.enableVertexAttribArray(this.instanceSizeLocation);
      gl.vertexAttribPointer(this.instanceSizeLocation, 2, gl.ctx.FLOAT, false, 0, 0);
      gl.vertexAttribDivisor(this.instanceSizeLocation, 1);
    }

    if (typeof this.instanceFillColorLocation === 'number' && this.instanceFillColorBuffer) {
      gl.bindBuffer(gl.ctx.ARRAY_BUFFER, this.instanceFillColorBuffer);
      gl.enableVertexAttribArray(this.instanceFillColorLocation);
      gl.vertexAttribPointer(this.instanceFillColorLocation, 4, gl.ctx.FLOAT, false, 0, 0);
      gl.vertexAttribDivisor(this.instanceFillColorLocation, 1);
    }

    if (typeof this.instanceStrokeColorLocation === 'number' && this.instanceStrokeColorBuffer) {
      gl.bindBuffer(gl.ctx.ARRAY_BUFFER, this.instanceStrokeColorBuffer);
      gl.enableVertexAttribArray(this.instanceStrokeColorLocation);
      gl.vertexAttribPointer(this.instanceStrokeColorLocation, 4, gl.ctx.FLOAT, false, 0, 0);
      gl.vertexAttribDivisor(this.instanceStrokeColorLocation, 1);
    }

    if (typeof this.instanceStrokeWidthLocation === 'number' && this.instanceStrokeWidthBuffer) {
      gl.bindBuffer(gl.ctx.ARRAY_BUFFER, this.instanceStrokeWidthBuffer);
      gl.enableVertexAttribArray(this.instanceStrokeWidthLocation);
      gl.vertexAttribPointer(this.instanceStrokeWidthLocation, 1, gl.ctx.FLOAT, false, 0, 0);
      gl.vertexAttribDivisor(this.instanceStrokeWidthLocation, 1);
    }

    if (typeof this.instanceSelectedLocation === 'number' && this.instanceSelectedBuffer) {
      gl.bindBuffer(gl.ctx.ARRAY_BUFFER, this.instanceSelectedBuffer);
      gl.enableVertexAttribArray(this.instanceSelectedLocation);
      gl.vertexAttribPointer(this.instanceSelectedLocation, 1, gl.ctx.FLOAT, false, 0, 0);
      gl.vertexAttribDivisor(this.instanceSelectedLocation, 1);
    }
  }

  private updateRectangles(rectangles: Object[]) {
    const gl = this.gl;
    const instanceCount = Math.min(rectangles.length, this.maxInstances);

    if (instanceCount === 0) return;

    // Pack instance data into arrays - FAST! No expensive matrix decomposition
    for (let i = 0; i < instanceCount; i++) {
      const obj = rectangles[i];

      // Copy transformation matrix directly (9 floats) - MUCH faster than decomposition!
      const matrixOffset = i * 9;
      const worldMatrix = obj.transform.worldMatrix;
      for (let j = 0; j < 9; j++) {
        this.instanceMatrixData[matrixOffset + j] = worldMatrix[j];
      }

      // Size
      this.instanceSizeData[i * 2] = obj.size.width || 100;
      this.instanceSizeData[i * 2 + 1] = obj.size.height || 100;

      // Fill color
      this.instanceFillColorData[i * 4] = obj.style.fill[0];
      this.instanceFillColorData[i * 4 + 1] = obj.style.fill[1];
      this.instanceFillColorData[i * 4 + 2] = obj.style.fill[2];
      this.instanceFillColorData[i * 4 + 3] = obj.style.fill[3];

      // Stroke color
      this.instanceStrokeColorData[i * 4] = obj.style.stroke[0];
      this.instanceStrokeColorData[i * 4 + 1] = obj.style.stroke[1];
      this.instanceStrokeColorData[i * 4 + 2] = obj.style.stroke[2];
      this.instanceStrokeColorData[i * 4 + 3] = obj.style.stroke[3];

      // Stroke width
      this.instanceStrokeWidthData[i] = obj.style.strokeWidth;

      // Selected
      this.instanceSelectedData[i] = obj.selected ? 1.0 : 0.0;
    }

    // Update buffers with instance data
    if (this.instanceMatrixBuffer) {
      gl.bindBuffer(gl.ctx.ARRAY_BUFFER, this.instanceMatrixBuffer);
      gl.ctx.bufferSubData(gl.ctx.ARRAY_BUFFER, 0, this.instanceMatrixData.subarray(0, instanceCount * 9));
    }

    if (this.instanceSizeBuffer) {
      gl.bindBuffer(gl.ctx.ARRAY_BUFFER, this.instanceSizeBuffer);
      gl.ctx.bufferSubData(gl.ctx.ARRAY_BUFFER, 0, this.instanceSizeData.subarray(0, instanceCount * 2));
    }

    if (this.instanceFillColorBuffer) {
      gl.bindBuffer(gl.ctx.ARRAY_BUFFER, this.instanceFillColorBuffer);
      gl.ctx.bufferSubData(gl.ctx.ARRAY_BUFFER, 0, this.instanceFillColorData.subarray(0, instanceCount * 4));
    }

    if (this.instanceStrokeColorBuffer) {
      gl.bindBuffer(gl.ctx.ARRAY_BUFFER, this.instanceStrokeColorBuffer);
      gl.ctx.bufferSubData(gl.ctx.ARRAY_BUFFER, 0, this.instanceStrokeColorData.subarray(0, instanceCount * 4));
    }

    if (this.instanceStrokeWidthBuffer) {
      gl.bindBuffer(gl.ctx.ARRAY_BUFFER, this.instanceStrokeWidthBuffer);
      gl.ctx.bufferSubData(gl.ctx.ARRAY_BUFFER, 0, this.instanceStrokeWidthData.subarray(0, instanceCount));
    }

    if (this.instanceSelectedBuffer) {
      gl.bindBuffer(gl.ctx.ARRAY_BUFFER, this.instanceSelectedBuffer);
      gl.ctx.bufferSubData(gl.ctx.ARRAY_BUFFER, 0, this.instanceSelectedData.subarray(0, instanceCount));
    }

    this.setupInstancedAttributes();

    gl.drawArraysInstanced(gl.ctx.TRIANGLES, 0, 6, instanceCount);
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

    // For circles, we still use the old method (could be instanced too)
    for (const { style, transform, size } of objects) {
      gl.setUniform4f('basic2DProgram', 'u_fill_color', style.fill);
      gl.setUniformMatrix3fv('basic2DProgram', 'u_object_transformation_matrix', transform.localMatrix);
      gl.setUniform2f('basic2DProgram', 'u_size', [size.radius!, size.radius!]);
      gl.drawArrays(gl.ctx.TRIANGLE_FAN, 0, this.circleVertices.length / 2);
    }
  }

  update(objects: Object[]) {
    this.gl.clear();

    this.updateViewportAndResolution();

    const rectangles: Array<Object> = [];
    const circles: Array<Object> = [];

    for (const object of objects) {
      const size = object.size;

      if (!object.visibility) {
        continue;
      }

      if (size.radius) {
        circles.push(object);
      } else {
        rectangles.push(object);
      }
    }

    // ---- Instanced Rectangles ----
    if (rectangles.length > 0) {
      this.updateRectangles(rectangles);
    }

    // ---- Circles ----
    if (circles.length > 0) {
      this.updateCircles(circles);
    }
  }
}
