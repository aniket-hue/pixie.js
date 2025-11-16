import { LucideZoomIn, Square, ZoomOut } from 'lucide-react';
import { useEffect, useState } from 'react';
import { RectangleDrawing } from '../core/drawing/impl/RectangleDrawing.class';
import { Events } from '../core/events';
import { cn } from '../shared/lib/cn';
import { useCanvasContext } from '../widgets/canvas/model/ctx';

function ToolbarItem({ children, onClick, active }: { children: React.ReactNode; onClick?: () => void; active?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        'flex items-center justify-center hover:bg-blue-900/50 rounded-md p-1 cursor-pointer text-neutral-100',
        active && 'bg-blue-900/50',
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function ToolbarGroup({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-1">{children}</div>;
}

function ToolbarSeparator() {
  return <div className="w-full h-px bg-neutral-100/20 my-1" />;
}

export function Sidebar() {
  const [drawingMode, setDrawingMode] = useState(false);
  const [zoomValue, setZoomValue] = useState(1);
  const { canvas } = useCanvasContext();

  useEffect(() => {
    if (!canvas) {
      return;
    }

    function zoomEventHandler(zoom: number) {
      setZoomValue(zoom);
    }

    if (canvas) {
      canvas.on(Events.ZOOM_CHANGED, zoomEventHandler);
    }

    return () => {
      canvas.off(Events.ZOOM_CHANGED, zoomEventHandler);
    };
  }, [canvas]);

  function handleZoomIn() {
    if (!canvas) {
      return;
    }

    canvas.zoom = zoomValue + 0.1;
  }

  function handleZoomOut() {
    if (!canvas) {
      return;
    }

    canvas.zoom = zoomValue - 0.1;
  }

  function handleResetZoom() {
    if (!canvas) {
      return;
    }

    canvas.zoom = 1;
  }

  function handleDrawingMode() {
    if (!canvas) {
      return;
    }

    setDrawingMode(true);

    canvas.drawing.setStrategy(
      new RectangleDrawing(canvas, {
        fillColor: 'rgba(145, 0, 0, 1)',
        onComplete: () => setDrawingMode(false),
        onCancel: () => setDrawingMode(false),
      }),
    );
  }

  return (
    <div className="bg-blue-900/70 ring-1 ring-blue-700/50 backdrop-blur-md absolute left-4 top-1/2 -translate-y-1/2 z-[1000] rounded-lg px-1 py-1 shadow-md">
      <ToolbarGroup>
        <ToolbarItem onClick={handleDrawingMode} active={drawingMode}>
          <Square size={20} />
        </ToolbarItem>
      </ToolbarGroup>
      <ToolbarSeparator />

      <ToolbarGroup>
        <ToolbarItem onClick={handleZoomIn}>
          <LucideZoomIn size={20} />
        </ToolbarItem>

        <ToolbarItem onClick={handleResetZoom}>
          <span className="text-neutral-100 text-xs font-medium">{zoomValue.toFixed(1)}</span>
        </ToolbarItem>

        <ToolbarItem onClick={handleZoomOut}>
          <ZoomOut size={20} />
        </ToolbarItem>
      </ToolbarGroup>
    </div>
  );
}
