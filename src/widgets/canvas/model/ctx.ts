import { createContext, useContext } from 'react';
import type { Canvas } from '../../../core/Canvas.class';

interface CanvasContextType {
  canvas: Canvas | null;
}

export const CanvasContext = createContext<CanvasContextType>({
  canvas: null,
});

export function useCanvasContext() {
  return useContext(CanvasContext);
}
