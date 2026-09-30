import { useEffect, useRef, useState } from 'react';
import { Canvas as CanvasClass } from '../../../core/Canvas.class';
import { createImage } from '../../../core/factory';
import { Sidebar } from '../../Sidebar';
import { CanvasContext } from '../model/ctx';
import { RenderDebugPanel } from './RenderDebugPanel';

export function Canvas() {
  const [canvas, setCanvas] = useState<CanvasClass | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) {
      return;
    }

    const canvas = new CanvasClass(canvasRef.current);
    setCanvas(canvas);

    (window as any).cx = canvas;

    const imageFactory = createImage({
      x: 0,
      y: 0,
      url: 'https://i.ibb.co/1YDqzmCK/Thumb-1920x1400.jpg',
      scaleX: 1,
      scaleY: 1,
      angle: 0,
    });

    const { promise } = imageFactory();

    promise.then((entity) => {
      canvas.world.addEntity(entity);
      canvas.requestRender('Demo.imageLoaded');
    });

    canvas.requestRender('Demo.initialRender');
  }, []);

  return (
    <CanvasContext.Provider value={{ canvas }}>
      <div className="w-screen h-screen">
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-red-300 size-1"></div>

        <Sidebar />
        <RenderDebugPanel />
        <canvas className="flex-1 block w-full h-full" ref={canvasRef} />
      </div>
    </CanvasContext.Provider>
  );
}
