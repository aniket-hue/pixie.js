import type { Camera } from './Camera.class';
import type { Canvas } from './Canvas.class';
import { getFill, getHeight, getSelected, getStroke, getStrokeWidth, getWidth, getWorldMatrix, isVisible } from './ecs/components';
import type { World } from './ecs/World.class';
import { argbToRgba } from './lib/color';
import type { GlCore } from './webgl/GlCore.class';

export class SceneRenderer {
  private gl: GlCore;

  private rectangleVertices: Float32Array;
  private rectangleOutlineVertices: Float32Array;

  private rectangleBuffer: WebGLBuffer | null = null;
  private rectangleOutlineBuffer: WebGLBuffer | null = null;

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

  constructor(context: Canvas) {
    this.gl = context.getGlCore();
    this.camera = context.camera;

    this.rectangleVertices = new Float32Array([-0.5, -0.5, 0.5, -0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5]);

    this.rectangleOutlineVertices = new Float32Array([-0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5]);

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

  private updateRectangles(rectangles: number[]) {
    const gl = this.gl;
    const instanceCount = Math.min(rectangles.length, this.maxInstances);

    if (instanceCount === 0) return;

    // Pack instance data into arrays - FAST! No expensive matrix decomposition
    for (let i = 0; i < instanceCount; i++) {
      const eid = rectangles[i];

      // Copy transformation matrix directly (9 floats) - MUCH faster than decomposition!
      const matrixOffset = i * 9;
      const worldMatrix = getWorldMatrix(eid);

      for (let j = 0; j < 9; j++) {
        this.instanceMatrixData[matrixOffset + j] = worldMatrix[j];
      }

      // Size
      this.instanceSizeData[i * 2] = getWidth(eid) || 100;
      this.instanceSizeData[i * 2 + 1] = getHeight(eid) || 100;

      // Fill color
      const fillColor = argbToRgba(getFill(eid));
      this.instanceFillColorData[i * 4] = fillColor[0];
      this.instanceFillColorData[i * 4 + 1] = fillColor[1];
      this.instanceFillColorData[i * 4 + 2] = fillColor[2];
      this.instanceFillColorData[i * 4 + 3] = fillColor[3];

      // Stroke color
      const strokeColor = argbToRgba(getStroke(eid));
      this.instanceStrokeColorData[i * 4] = strokeColor[0];
      this.instanceStrokeColorData[i * 4 + 1] = strokeColor[1];
      this.instanceStrokeColorData[i * 4 + 2] = strokeColor[2];
      this.instanceStrokeColorData[i * 4 + 3] = strokeColor[3];

      // Stroke width
      this.instanceStrokeWidthData[i] = getStrokeWidth(eid);

      // Selected
      this.instanceSelectedData[i] = getSelected(eid) ? 0.0 : 1.0;
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

  render(world: World) {
    this.updateViewportAndResolution();

    const rectangles = [];

    for (const eid of world.getEntities()) {
      if (!isVisible(eid)) {
        continue;
      }

      rectangles.push(eid);
    }

    // ---- Instanced Rectangles ----
    if (rectangles.length > 0) {
      this.updateRectangles(rectangles);
    }
  }
}
