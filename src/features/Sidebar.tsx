import { Download, Group, LucideZoomIn, Square, ZoomOut } from 'lucide-react';
import { useEffect, useState } from 'react';
import { RectangleDrawing } from '../core/drawing/impl/RectangleDrawing.class';
import { Events } from '../core/events';
import { createSelectionGroup } from '../core/factory/selectionGroup';
import { rgbaToArgb } from '../core/lib/color';
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

  async function handleCapture() {
    if (!canvas) {
      return;
    }

    const selectedObjects = canvas.getSelectedObjects();

    const dataUrl = await canvas.toDataURL({}, { entities: selectedObjects });
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = 'screenshot.png';
    a.click();
  }

  function handleGroup() {
    if (!canvas) {
      return;
    }

    const activeGroup = canvas.getActiveGroup();

    if (!activeGroup) {
      return;
    }

    const children = [...(activeGroup.hierarchy.children ?? [])];

    if (children.length === 0) {
      return;
    }

    const groupFactory = createSelectionGroup({ children });
    const group = groupFactory();

    group.style.setFill(rgbaToArgb(122, 23, 0, 0.2));
    group.interaction.setSelectable(true);

    canvas.world.removeEntity(activeGroup);
    canvas.world.addEntity(group);

    children.forEach((child) => {
      group.hierarchy.addChild(child);
    });

    canvas.requestRender();
  }

  return (
    <div className="bg-blue-900/70 ring-1 ring-blue-700/50 backdrop-blur-md absolute left-4 top-1/2 -translate-y-1/2 z-[1000] rounded-lg px-1 py-1 shadow-md">
      <ToolbarGroup>
        <ToolbarItem onClick={handleDrawingMode} active={drawingMode}>
          <Square size={20} />
        </ToolbarItem>

        <ToolbarItem onClick={handleGroup}>
          <Group size={20} />
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

        <ToolbarSeparator />

        <ToolbarItem onClick={handleCapture}>
          <Download size={20} />
        </ToolbarItem>
      </ToolbarGroup>
    </div>
  );
}
