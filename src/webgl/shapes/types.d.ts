export interface Shape {
  angle: number;
  draw(
    gl: WebGLRenderingContext,
    {
      program,
    }: {
      program: WebGLProgram;
    },
  ): void;
}
