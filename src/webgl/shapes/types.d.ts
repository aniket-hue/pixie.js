export interface Shape {
  draw(
    gl: WebGLRenderingContext,
    {
      program,
    }: {
      program: WebGLProgram;
    },
  ): void;
}
