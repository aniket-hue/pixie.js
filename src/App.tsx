import { useCallback, useEffect, useRef, useState } from 'react';
import './App.css';
import { Canvas } from './webgl/Canvas.class';
import { InputHandler } from './webgl/input/InputHandler.class';
import { Renderer } from './webgl/Renderer.class';
import Circle from './webgl/shapes/Circle.class';
import { Grid } from './webgl/shapes/Grid.class';
import Rectangle from './webgl/shapes/Rectangle.class';
import type { Shape } from './webgl/shapes/types';

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const webglCanvasRef = useRef<Canvas>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [cameraInfo, setCameraInfo] = useState({ zoom: 1 });

  const animate = useCallback(() => {
    if (webglCanvasRef.current) {
      webglCanvasRef.current?.render();
    }

    animationFrameRef.current = requestAnimationFrame(animate);
  }, []);

  const handleReset = useCallback(() => {
    if (webglCanvasRef.current) {
      webglCanvasRef.current?.setZoom(1);
    }
  }, []);

  useEffect(() => {
    if (canvasRef.current) {
      const canvas = new Canvas(canvasRef.current);
      webglCanvasRef.current = canvas;

      canvas.add(
        new Grid({
          gridSize: 100,
          color: [0.9, 0.9, 0.9, 0.5],
          majorGridSize: 500,
          majorColor: [0.8, 0.8, 0.8, 1],
        }),
      );

      // Add some demo objects scattered around the infinite canvas
      const demoObjects: Shape[] = [new Rectangle({ x: 0, y: 0, width: 100, height: 100, color: [1, 0.2, 0.2, 0.8], scaleX: 1 })];

      const rows = 10;
      const cols = 10;
      const spacing = 100;

      for (let i = -rows / 2; i < rows / 2; i++) {
        for (let j = -cols / 2; j < cols / 2; j++) {
          const color = [Math.random(), Math.random(), Math.random(), 1];
          const angle = Math.random() * 2 * Math.PI;
          const scaleX = Math.random() * 2 + 1;
          const scaleY = Math.random() * 2 + 1;
          const radius = Math.random() * 10 + 10;

          const row = i;
          const col = j;

          const x = col * spacing + Math.random();
          const y = row * spacing + Math.random();
          const width = Math.random() * 10 + 10;
          const height = Math.random() * 10 + 10;

          // demoObjects.push(new Rectangle({ x, y, width, height, color, scaleX, scaleY, angle }));
          demoObjects.push(new Circle({ x, y, color, radius: radius }));
        }
      }

      demoObjects.forEach((obj) => {
        canvas.add(obj);
      });

      // Start animation loop
      animate();
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [animate]);

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
