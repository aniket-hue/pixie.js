import { useCallback, useEffect, useRef, useState } from 'react';
import './App.css';
import { Canvas } from './webgl/Canvas.class';
import { Group } from './webgl/ecs/components/Group.class';
import Rectangle from './webgl/ecs/components/shapes/Rectangle.class';
import { Events } from './webgl/events';

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const webglCanvasRef = useRef<Canvas>(null);
  const [cameraInfo, setCameraInfo] = useState({ zoom: 1 });

  const handleReset = useCallback(() => {
    if (webglCanvasRef.current) {
      webglCanvasRef.current?.setZoom(1);
    }
  }, []);

  useEffect(() => {
    if (canvasRef.current) {
      const canvas = new Canvas(canvasRef.current);
      webglCanvasRef.current = canvas;

      canvas.on(Events.ZOOM_CHANGED, (zoom) => {
        setCameraInfo({ zoom });
      });

      (window as any).cx = canvas;

      // new Circle({ x: 0, y: 0, fill: [1, 0.2, 0.2, 0.8], radius: 100, canvas });
      const rect = new Rectangle({ x: 0, y: 0, width: 100, height: 100, fill: [1, 0.2, 0.2, 0.3], canvas });
      const rect2 = new Rectangle({ x: 200, y: 200, width: 100, height: 100, fill: [1, 1, 0.2, 0.3], canvas });
      const rect3 = new Rectangle({ x: 0, y: 0, width: 100, height: 100, fill: [1, 1, 0.2, 0.3], canvas });

      canvas.add(rect);
      canvas.add(rect2);
      canvas.add(rect3);

      const group = new Group([rect.entityId, rect2.entityId], webglCanvasRef.current);
      canvas.add(group);

      // const group2 = new Group([rect3.entityId, group.entityId], webglCanvasRef.current);
      // canvas.add(group2);

      // canvas.add(rect3);

      const rows = 10;
      const cols = 10;
      const spacing = 100;

      const ids = [];

      // for (let i = -rows / 2; i < rows / 2; i++) {
      //   for (let j = -cols / 2; j < cols / 2; j++) {
      //     const fill = [Math.random(), Math.random(), Math.random(), 1];
      //     const angle = Math.random() * 2 * Math.PI;
      //     const scaleX = Math.random() * 2 + 1;
      //     const scaleY = Math.random() * 2 + 1;
      //     const radius = Math.random() * 10 + 10;

      //     const row = i;
      //     const col = j;

      //     const x = col * spacing + Math.random();
      //     const y = row * spacing + Math.random();
      //     const width = Math.random() * 10 + 10;
      //     const height = Math.random() * 10 + 10;

      //     const rect = new Rectangle({ x, y, width, height, fill, scaleX, scaleY, angle, canvas });
      //     const circle = new Circle({ x, y, fill, radius, canvas });
      //     // canvas.add(circle);
      //     canvas.add(rect);
      //   }
      // }
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
