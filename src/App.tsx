import { useCallback, useEffect, useRef, useState } from 'react';
import './App.css';
import { Canvas } from './core/Canvas.class';
import { Events } from './core/events';
import { createRectangle } from './core/factory';

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
      const spacing = 200;
      const nums = 2;

      for (let i = -nums / 2; i < nums / 2; i++) {
        for (let j = -nums / 2; j < nums / 2; j++) {
          const col = i;
          const row = j;

          const x = col * spacing + Math.random();
          const y = row * spacing + Math.random();

          const angle = Math.random() * 2 * Math.PI;
          const scaleX = Math.random() * 2 + 0.5;
          const scaleY = Math.random() * 2 + 0.5;

          // Random hex
          // 0x000000 - 0xffffff
          const fill = 0x00000 + Math.floor(Math.random() * 16777215);
          const stroke = 0xff0000 + Math.floor(Math.random() * 16777215);
          const strokeWidth = Math.random() * 2 + 0.5;

          const width = Math.random() * 100 + 10;
          const height = Math.random() * 100 + 10;

          const rect = createRectangle({
            x,
            y,
            width,
            height,
            fill,
            stroke,
            strokeWidth,
            scaleX,
            scaleY,
            angle,
          });

          const rectEid = world.addEntityFactory(rect);
          shapes.push(rectEid);
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
