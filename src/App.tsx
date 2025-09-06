import { useCallback, useEffect, useRef, useState } from 'react';
import './App.css';
import { InputHandler } from './webgl/input/InputHandler.class';
import Renderer from './webgl/renderer/Renderer.class';
import { Grid } from './webgl/shapes/Grid.class';
import Rectangle from './webgl/shapes/Rectangle.class';

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const inputHandlerRef = useRef<InputHandler | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [cameraInfo, setCameraInfo] = useState({ zoom: 1 });

  const animate = useCallback(() => {
    if (rendererRef.current) {
      rendererRef.current.render();

      // Update camera info display
      const camera = rendererRef.current.camera;

      setCameraInfo({
        zoom: Math.round(camera.zoom * 100) / 100,
      });
    }
    animationFrameRef.current = requestAnimationFrame(animate);
  }, []);

  const handleReset = useCallback(() => {
    if (rendererRef.current) {
      rendererRef.current.camera.zoom = 1;
    }
  }, []);

  useEffect(() => {
    if (canvasRef.current) {
      const renderer = new Renderer(canvasRef.current);
      rendererRef.current = renderer;

      // // Add infinite grid background
      renderer.addObject(
        new Grid({
          gridSize: 50,
          color: [0.9, 0.9, 0.9, 0.5],
          majorGridSize: 500,
          majorColor: [0.8, 0.8, 0.8, 1],
        }),
      );

      // Add some demo objects scattered around the infinite canvas
      const demoObjects = [
        // Central cluster
        new Rectangle({ x: 0, y: 0, width: 100, height: 100, color: [1, 0.2, 0.2, 0.8], angle: 0, scaleX: 2, scaleY: 2 }),
        // new Rectangle({ x: 5, y: 100, width: 80, height: 60, color: [0.2, 1, 0.2, 0.8], angle: Math.PI / 3 }),
        // new Rectangle({ x: -25, y: 75, width: 60, height: 80, color: [0.2, 0.2, 1, 0.8] }),

        // Distant objects
        new Rectangle({ x: -800, y: -600, width: 150, height: 100, color: [1, 1, 0.2, 0.7] }),
        new Rectangle({ x: 600, y: -400, width: 120, height: 120, color: [1, 0.2, 1, 0.7] }),
        new Rectangle({ x: -200, y: 500, width: 200, height: 80, color: [0.2, 1, 1, 0.7] }),
        new Rectangle({ x: 700, y: 600, width: 100, height: 180, color: [1, 0.5, 0.2, 0.7] }),

        // Very distant objects
        new Rectangle({ x: -1500, y: -1000, width: 300, height: 200, color: [0.5, 0.5, 1, 0.6] }),
        new Rectangle({ x: 1200, y: 800, width: 250, height: 150, color: [1, 0.5, 0.5, 0.6] }),
      ];

      demoObjects.forEach((obj) => {
        renderer.addObject(obj);
      });

      // Setup input handling
      const inputHandler = new InputHandler(canvasRef.current, renderer.camera, () => {
        // Re-render on interaction (this will be called automatically by the animation loop)
      });
      inputHandlerRef.current = inputHandler;

      // Start animation loop
      animate();
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (inputHandlerRef.current) {
        inputHandlerRef.current.destroy();
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
