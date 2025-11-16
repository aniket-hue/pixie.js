import fss from './shaders/fss.frag?raw';
import vss from './shaders/vss.vert?raw';

type Programs = 'basic2DProgram';

export class GlCore {
  ctx: WebGL2RenderingContext;
  _basic2DProgram: WebGLProgram;

  constructor(canvasElement: HTMLCanvasElement) {
    const gl = canvasElement.getContext('webgl2');

    if (!gl) {
      throw new Error('WebGL not supported');
    }

    this.ctx = gl;

    this.ctx.enable(this.ctx.BLEND);
    this.ctx.blendFunc(this.ctx.SRC_ALPHA, this.ctx.ONE_MINUS_SRC_ALPHA);

    const vertexShader = this.createShader(this.ctx.VERTEX_SHADER, vss);
    const fragmentShader = this.createShader(this.ctx.FRAGMENT_SHADER, fss);

    this._basic2DProgram = this.createProgram(vertexShader, fragmentShader);

    this.useProgram(this._basic2DProgram);
  }

  private getProgram(program: Programs) {
    switch (program) {
      case 'basic2DProgram':
        return this._basic2DProgram;
      default:
        throw new Error(`Program ${program} not found`);
    }
  }

  get width() {
    return this.ctx.canvas.width;
  }

  get height() {
    return this.ctx.canvas.height;
  }

  createShader(type: GLenum, source: string) {
    const gl = this.ctx;
    const shader = gl.createShader(type);

    if (!shader) {
      throw new Error('Failed to create shader');
    }

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      gl.deleteShader(shader);
      console.error('Shader compilation error:', gl.getShaderInfoLog(shader));
    }

    return shader;
  }

  createProgram(vertexShader: WebGLShader, fragmentShader: WebGLShader) {
    const gl = this.ctx;
    const program = gl.createProgram();

    if (!program) {
      throw new Error('Failed to create program');
    }

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program failed to link:', gl.getProgramInfoLog(program));
    }

    return program;
  }

  useProgram(program: WebGLProgram) {
    this.ctx.useProgram(program);
  }

  enable(cap: GLenum) {
    this.ctx.enable(cap);
  }

  disable(cap: GLenum) {
    this.ctx.disable(cap);
  }

  blendFunc(sfactor: GLenum, dfactor: GLenum) {
    this.ctx.blendFunc(sfactor, dfactor);
  }

  clearColor(r: number, g: number, b: number, a: number) {
    this.ctx.clearColor(r, g, b, a);
  }

  clear() {
    this.ctx.clearColor(0, 0, 0, 1);
    this.ctx.clear(this.ctx.COLOR_BUFFER_BIT);
  }

  getAttribLocation(program: Programs, name: string) {
    return this.ctx.getAttribLocation(this.getProgram(program), name);
  }

  getUniformLocation(program: Programs, name: string) {
    return this.ctx.getUniformLocation(this.getProgram(program), name);
  }

  setUniform1f(program: Programs, name: string, value: number) {
    this.ctx.uniform1f(this.getUniformLocation(program, name), value);
  }

  setUniform1i(program: Programs, name: string, value: number) {
    this.ctx.uniform1i(this.getUniformLocation(program, name), value);
  }

  setUniform2f(program: Programs, name: string, value: [number, number]) {
    this.ctx.uniform2f(this.getUniformLocation(program, name), value[0], value[1]);
  }

  setUniform3f(program: Programs, name: string, value: [number, number, number]) {
    this.ctx.uniform3f(this.getUniformLocation(program, name), value[0], value[1], value[2]);
  }

  setUniform4f(program: Programs, name: string, value: [number, number, number, number]) {
    this.ctx.uniform4f(this.getUniformLocation(program, name), value[0], value[1], value[2], value[3]);
  }

  setUniformMatrix3fv(program: Programs, name: string, value: number[], transpose: boolean = false) {
    this.ctx.uniformMatrix3fv(this.getUniformLocation(program, name), transpose, value);
  }

  createBuffer() {
    return this.ctx.createBuffer();
  }

  bindBuffer(target: GLenum, buffer: WebGLBuffer) {
    this.ctx.bindBuffer(target, buffer);
  }

  bufferData(target: GLenum, data: ArrayBufferView, usage: GLenum) {
    this.ctx.bufferData(target, data, usage);
  }

  enableVertexAttribArray(index: GLuint) {
    this.ctx.enableVertexAttribArray(index);
  }

  disableVertexAttribArray(index: GLuint) {
    this.ctx.disableVertexAttribArray(index);
  }

  vertexAttribPointer(index: GLuint, size: GLint, type: GLenum, normalized: GLboolean, stride: GLsizei, offset: GLintptr) {
    this.ctx.vertexAttribPointer(index, size, type, normalized, stride, offset);
  }

  drawArrays(mode: GLenum, first: GLint, count: GLsizei) {
    this.ctx.drawArrays(mode, first, count);
  }

  drawArraysInstanced(mode: GLenum, first: GLint, count: GLsizei, instanceCount: GLsizei) {
    this.ctx.drawArraysInstanced(mode, first, count, instanceCount);
  }

  vertexAttribDivisor(index: GLuint, divisor: GLuint) {
    this.ctx.vertexAttribDivisor(index, divisor);
  }

  deleteBuffer(buffer: WebGLBuffer | null) {
    if (buffer) {
      this.ctx.deleteBuffer(buffer);
    }
  }

  lineWidth(width: number) {
    this.ctx.lineWidth(width);
  }

  captureCanvasRegion(x: number, y: number, width: number, height: number) {
    // Create a buffer to hold the pixel data
    const pixels = new Uint8Array(width * height * 4); // 4 bytes per pixel (RGBA)

    // Read pixels from the WebGL context
    // Note: WebGL's coordinate system has origin at bottom-left
    // You may need to flip the y coordinate
    const canvasHeight = this.ctx.canvas.height;
    const flippedY = canvasHeight - y - height;

    this.ctx.readPixels(x, flippedY, width, height, this.ctx.RGBA, this.ctx.UNSIGNED_BYTE, pixels);

    return pixels;
  }
}
