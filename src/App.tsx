import { useCallback, useEffect, useRef, useState } from 'react';
import './App.css';
import { Canvas } from './core/Canvas.class';
import { Events } from './core/events';
import { createImage, createRectangle } from './core/factory';

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const webglCanvasRef = useRef<Canvas>(null);
  const [cameraInfo, setCameraInfo] = useState({ zoom: 1 });

  const handleReset = useCallback(() => {
    if (webglCanvasRef.current?.camera) {
      webglCanvasRef.current.camera.zoom = 1;
    }
  }, []);

  useEffect(() => {
    if (canvasRef.current) {
      const canvas = new Canvas(canvasRef.current);
      const world = canvas.world;
      webglCanvasRef.current = canvas;

      canvas.on(Events.ZOOM_CHANGED, (zoom) => {
        setCameraInfo({ zoom });
      });

      (window as any).cx = canvas;

      const shapes: number[] = [];
      const spacing = 500;
      const nums = 10;

      const imageUrls = Array.from({ length: nums * nums }).map((_, i) => {
        return `https://picsum.photos/${400}/${400}?random=${i + 7}`;
      });

      let imgIdx = 0;

      for (let i = -nums / 2; i < nums / 2; i++) {
        for (let j = -nums / 2; j < nums / 2; j++) {
          const col = i;
          const row = j;

          const x = col * spacing + Math.random();
          const y = row * spacing + Math.random();

          const imageFactory = createImage({
            x: x,
            y: y,
            url: imageUrls[imgIdx++],
            scaleX: 1,
            scaleY: 1,
            angle: Math.random() * 0.5 - 0.25, // Small random rotation
          });

          // Since createImage is async, we need to handle it properly
          imageFactory(world)
            .then((imageEid) => {
              shapes.push(imageEid);
              canvas.requestRender();
            })
            .catch((error) => {
              console.error('Failed to create image:', error);
            });
        }
      }

      canvas.requestRender();
    }
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Control Panel */}
      <div
        style={{
          padding: '12px',
          background: 'rgba(0,0,0,0.8)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          fontSize: '14px',
          fontFamily: 'monospace',
        }}
      >
        <div>Camera zoom: {cameraInfo.zoom * 100}</div>

        <button type="button" onClick={handleReset} style={{ padding: '4px 12px', fontSize: '12px' }}>
          Reset Zoom
        </button>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        style={{
          flex: 1,
          display: 'block',
          width: '100%',
          height: '100%',
          background: '#f5f5f5',
        }}
      />
    </div>
  );
}

export default App;
