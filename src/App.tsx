import { useEffect, useRef } from 'react';
import './App.css';
import Renderer from './webgl/renderer/Renderer.class';
import Rectangle from './webgl/shapes/Rectangle.class';

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<Renderer | null>(null);

  useEffect(() => {
    if (canvasRef.current) {
      const renderer = new Renderer(canvasRef.current);
      rendererRef.current = renderer;

      for (let i = 0; i < 10; i++) {
        renderer.addObject(
          new Rectangle({
            x: i * 10,
            y: i * 10,
            width: 40,
            height: 40,
            color: [Math.random() * 0.8 + 0.2, Math.random() * 0.8 + 0.2, Math.random() * 0.8 + 0.2, 0.8],
          }),
        );
      }

      renderer.render();
    }
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <canvas
        ref={canvasRef}
        onWheel={(e) => {
          rendererRef.current?.camera.pan(e.deltaX, e.deltaY);
        }}
        style={{
          flex: 1,
          display: 'block',
          width: '100%',
          height: '100%',
        }}
      />
    </div>
  );
}

export default App;
