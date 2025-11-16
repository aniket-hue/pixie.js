import { useEffect, useRef, useState } from 'react';
import { Canvas as CanvasClass } from '../../../core/Canvas.class';
import { createImage } from '../../../core/factory';
import { Sidebar } from '../../../features/Sidebar';
import { CanvasContext } from '../model/ctx';

export function Canvas() {
  const [canvas, setCanvas] = useState<CanvasClass | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) {
      return;
    }

    const canvas = new CanvasClass(canvasRef.current);
    setCanvas(canvas);
    const world = canvas.world;

    (window as any).cx = canvas;

    const imageFactory = createImage({
      x: 0,
      y: 0,
      url: 'https://images.unsplash.com/photo-1706111597624-69bfaa902da0?q=80&w=987&auto=format&fit=crop&ixlib=rb-4.1.0',
      scaleX: 1,
      scaleY: 1,
      angle: 0,
    });

    imageFactory(world).then(() => {
      canvas.zoom = 0.5;
      canvas.requestRender();
    });

    canvas.requestRender();
  }, []);

  return (
    <CanvasContext.Provider value={{ canvas }}>
      <div className="w-screen h-screen">
        <Sidebar />
        <canvas className="flex-1 block w-full h-full" ref={canvasRef} />
      </div>
    </CanvasContext.Provider>
  );
}
