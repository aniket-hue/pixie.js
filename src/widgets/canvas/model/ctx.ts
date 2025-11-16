import { createContext, useContext } from 'react';
import type { Canvas } from '../../../core/Canvas.class';

interface CanvasContextType {
  zoom: number;
  canvas: Canvas | null;
}

export const CanvasContext = createContext<CanvasContextType>({
  zoom: 1,
  canvas: null,
});

export function useCanvasContext() {
  return useContext(CanvasContext);
}
