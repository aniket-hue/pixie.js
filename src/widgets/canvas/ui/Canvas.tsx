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
    const world = canvas.world;

    (window as any).cx = canvas;

    const rectFactory = createRectangle({
      x: 2000,
      y: -2000,
      width: 500,
      height: 500,
      // smoothing red
      fill: rgbaToArgb(124, 0, 0, 0.5),
    });

    world.addEntityFactory(rectFactory);

    const imageFactory = createImage({
      x: 3000,
      y: 0,
      // url: 'https://images.unsplash.com/photo-1706111597624-69bfaa902da0?q=80&w=987&auto=format&fit=crop&ixlib=rb-4.1.0',
      url: 'https://www.shutterstock.com/shutterstock/photos/2699634123/display_1500/stock-photo-i-need-a-geometric-design-of-a-lions-head-from-the-side-with-medium-detail-and-a-x-2699634123.jpg',
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

  function handleMouseDown(event: React.MouseEvent<HTMLCanvasElement>) {
    const p = canvas?.camera.screenToWorld(event.clientX, event.clientY);

    const pixels = canvas?.getGlCore().readPixels(p.x, p.y, 1, 1);
    console.log(pixels);
  }

  return (
    <CanvasContext.Provider value={{ canvas }}>
      <div className="w-screen h-screen">
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-red-300 size-1"></div>

        <Sidebar />
        <canvas className="flex-1 block w-full h-full" ref={canvasRef} onClick={handleMouseDown} />
      </div>
    </CanvasContext.Provider>
  );
}
