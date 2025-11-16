export const InteractionMode = {
  IDLE: 'IDLE',
  DRAGGING: 'DRAGGING',
  SCALING: 'SCALING',
  ROTATING: 'ROTATING',
  DRAWING: 'DRAWING',
} as const;

export type InteractionMode = (typeof InteractionMode)[keyof typeof InteractionMode];

export class InteractionModeManager {
  private mode: InteractionMode = InteractionMode.IDLE;

  getMode(): InteractionMode {
    return this.mode;
  }

  setMode(mode: InteractionMode): void {
    this.mode = mode;
  }

  isIdle(): boolean {
    return this.mode === InteractionMode.IDLE;
  }

  isDragging(): boolean {
    return this.mode === InteractionMode.DRAGGING;
  }

  isScaling(): boolean {
    return this.mode === InteractionMode.SCALING;
  }

  isRotating(): boolean {
    return this.mode === InteractionMode.ROTATING;
  }

  isInteracting(): boolean {
    return this.mode !== InteractionMode.IDLE;
  }

  isDrawing(): boolean {
    return this.mode === InteractionMode.DRAWING;
  }

  reset(): void {
    this.mode = InteractionMode.IDLE;
  }
}
