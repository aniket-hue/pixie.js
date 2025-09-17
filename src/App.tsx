import { useCallback, useEffect, useRef, useState } from 'react';
import './App.css';
import { Canvas } from './core/Canvas.class';
import {
  addChild,
  getParent,
  markDirty,
  markVisible,
  updateDraggable,
  updateFill,
  updateHeight,
  updateLocalMatrix,
  updateParent,
  updateSelectable,
  updateStroke,
  updateStrokeWidth,
  updateWidth,
  updateWorldMatrix,
} from './core/ecs/components';
import { Events } from './core/events';
import { m3 } from './core/math';

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
      const world = canvas.world;
      webglCanvasRef.current = canvas;

      canvas.on(Events.ZOOM_CHANGED, (zoom) => {
        setCameraInfo({ zoom });
      });

      (window as any).cx = canvas;

      const shapes: number[] = [];
      const spacing = 200;
      const nums = 2;
      const parent2 = world.addEntity();
      const parent = world.addEntity();

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

          const rect = world.addEntity();

          // world.addComponent(LocalMatrix, rect);
          // world.addComponent(Size, rect);
          // world.addComponent(Interaction, rect);

          const matrix = m3.compose({
            tx: x,
            ty: y,
            sx: scaleX,
            sy: scaleY,
            r: angle,
          });

          updateLocalMatrix(rect, matrix);
          updateWorldMatrix(rect, matrix);

          updateWidth(rect, width);
          updateHeight(rect, height);

          updateStroke(rect, stroke);
          updateFill(rect, fill);
          updateStrokeWidth(rect, strokeWidth);

          updateDraggable(rect, true);
          updateSelectable(rect, false);

          markVisible(rect, true);

          markDirty(rect);
          shapes.push(rect);
        }
      }

      updateLocalMatrix(parent, [0, 0, 0, 0, 0, 0, 0, 0, 1]);
      updateWorldMatrix(parent, [0, 0, 0, 0, 0, 0, 0, 0, 1]);

      updateWidth(parent, 0);
      updateHeight(parent, 0);

      updateFill(parent, 0x808080);

      updateDraggable(parent, true);
      updateSelectable(parent, false);
      markVisible(parent, true);

      updateLocalMatrix(parent2, [0, 0, 0, 0, 0, 0, 0, 0, 1]);
      updateWorldMatrix(parent2, [0, 0, 0, 0, 0, 0, 0, 0, 1]);

      updateWidth(parent2, 0);
      updateHeight(parent2, 0);

      updateFill(parent2, 0x808504);

      updateDraggable(parent2, true);
      updateSelectable(parent2, false);

      markVisible(parent2, true);

      markDirty(parent);
      markDirty(parent2);

      shapes.forEach((shape) => {
        addChild(parent, shape);
        updateParent(shape, parent);
      });

      const newShape = world.addEntity();
      const localMatrix = m3.compose({ tx: 600, ty: 600, sx: 1, sy: 1, r: 0 });
      updateLocalMatrix(newShape, localMatrix);
      updateWorldMatrix(newShape, localMatrix);

      updateFill(newShape, 0x806080);
      updateStroke(newShape, 0xff0000);
      updateStrokeWidth(newShape, 1);

      updateDraggable(newShape, true);
      updateSelectable(newShape, false);

      markVisible(newShape, true);

      updateWidth(newShape, 500);
      updateHeight(newShape, 500);

      addChild(parent2, newShape);
      addChild(parent2, parent);

      updateParent(newShape, parent2);
      updateParent(parent, parent2);

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
