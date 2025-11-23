import { useEffect, useRef, useState } from 'react';
import { Canvas as CanvasClass } from '../../../core/Canvas.class';
import { createImage, createRectangle } from '../../../core/factory';
import { rgbaToArgb } from '../../../core/lib/color';
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

    (window as any).cx = canvas;

    // const rectFactory = createRectangle({
    //   x: 1000,
    //   y: 1000,
    //   width: 500,
    //   height: 500,
    //   fill: rgbaToArgb(124, 244, 0, 1),
    // });

    // const rectEntity = rectFactory();
    // canvas.world.addEntity(rectEntity);

    const imageFactory = createImage({
      x: 0,
      y: 0,
      // url: 'https://images.unsplash.com/photo-1706111597624-69bfaa902da0?q=80&w=987&auto=format&fit=crop&ixlib=rb-4.1.0',
      url: 'https://i.ibb.co/1YDqzmCK/Thumb-1920x1400.jpg',
      scaleX: 1,
      scaleY: 1,
      angle: 0,
    });

    const { promise } = imageFactory();

    promise.then((entity) => {
      canvas.world.addEntity(entity);
      canvas.requestRender();
    });

    canvas.requestRender();
  }, []);

  return (
    <CanvasContext.Provider value={{ canvas }}>
      <div className="w-screen h-screen">
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-red-300 size-1"></div>

        <Sidebar />
        <canvas className="flex-1 block w-full h-full" ref={canvasRef} />
      </div>
    </CanvasContext.Provider>
  );
}
