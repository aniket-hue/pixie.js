export const InteractionMode = {
  IDLE: 'IDLE',
  DRAGGING: 'DRAGGING',
  SCALING: 'SCALING',
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

  isInteracting(): boolean {
    return this.mode !== InteractionMode.IDLE;
  }

  reset(): void {
    this.mode = InteractionMode.IDLE;
  }
}
