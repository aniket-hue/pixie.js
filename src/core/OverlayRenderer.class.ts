import type { Camera } from './Camera.class';
import type { Canvas } from './Canvas.class';
import type { World } from './ecs/World.class';
import type { SelectionManager } from './selection/SelectionManager.class';
import type { GlCore } from './webgl/GlCore.class';

export class OverlayRenderer {
  private gl: GlCore;
  private selectionManager: SelectionManager;
  private camera: Camera;

  private selectionBoxVertices: Float32Array;
  private selectionBoxBuffer: WebGLBuffer | null = null;
  private selectionBoxPositionLocation: number | null = null;

  constructor(context: Canvas) {
    this.gl = context.getGlCore();
    this.selectionManager = context.selectionManager;
    this.camera = context.camera;

    this.selectionBoxVertices = new Float32Array([-0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5, -0.5, -0.5]);

    this.initBuffers();
    this.initAttributeLocations();
  }

  private initBuffers() {
    const gl = this.gl;
    this.selectionBoxBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ctx.ARRAY_BUFFER, this.selectionBoxBuffer);
    gl.bufferData(gl.ctx.ARRAY_BUFFER, this.selectionBoxVertices, gl.ctx.STATIC_DRAW);
  }

  private initAttributeLocations() {
    const gl = this.gl;
    this.selectionBoxPositionLocation = gl.getAttribLocation('overlayProgram', 'a_position');
  }

  private setupOverlayRenderingContext() {
    const gl = this.gl;
    gl.useProgram(gl._overlayProgram);
    gl.enable(gl.ctx.BLEND);
    gl.blendFunc(gl.ctx.SRC_ALPHA, gl.ctx.ONE_MINUS_SRC_ALPHA);
    gl.ctx.viewport(0, 0, gl.width, gl.height);
  }

  drawSelectionBox(selectionMatrix: number[]) {
    const gl = this.gl;
    const buffer = this.selectionBoxBuffer;
    const positionLocation = this.selectionBoxPositionLocation;

    if (positionLocation === null || positionLocation === -1 || !buffer) {
      return;
    }

    gl.setUniformMatrix3fv('overlayProgram', 'u_viewport_transform_matrix', this.camera.viewportTransformMatrix);
    gl.setUniformMatrix3fv('overlayProgram', 'u_object_transform_matrix', selectionMatrix);
    gl.setUniform2f('overlayProgram', 'u_resolution', [gl.width, gl.height]);
    gl.setUniform4f('overlayProgram', 'u_color', [0.2, 0.6, 1.0, 0.3]);

    gl.bindBuffer(gl.ctx.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.ctx.FLOAT, false, 0, 0);

    gl.drawArrays(gl.ctx.LINE_STRIP, 0, 5);
    gl.disableVertexAttribArray(positionLocation);
  }

  render(_world: World) {
    this.setupOverlayRenderingContext();

    if (this.selectionManager.selectionBox !== null) {
      this.drawSelectionBox(this.selectionManager.selectionBox);
    }

    this.gl.useProgram(this.gl._basic2DProgram);
  }
}
