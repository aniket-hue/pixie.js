import { Download, Group, LucideZoomIn, Square, ZoomOut } from 'lucide-react';
import { useEffect, useState } from 'react';

import { RectangleDrawing } from '../../../core/drawing/impl/RectangleDrawing.class';
import type { Entity } from '../../../core/ecs/base/Entity.class';
import { Events } from '../../../core/events';
import { createSelectionGroup } from '../../../core/factory/selectionGroup';
import { rgbaToArgb } from '../../../core/lib/color';
import { useCanvasContext } from '../../../widgets/canvas/model/ctx';
import { Filters } from './Filters';
import { ToolbarGroup, ToolbarItemButton, ToolbarSeparator } from './toolbar';

export function Sidebar() {
  const [currentGroup, setCurrentGroup] = useState<Entity | null>(null);
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

    function selectionGroupEventHandler({ target }: { target: Entity }) {
      setCurrentGroup(target);
    }

    function selectionGroupRemovedEventHandler() {
      setCurrentGroup(null);
    }

    if (canvas) {
      canvas.on(Events.ZOOM_CHANGED, zoomEventHandler);
      canvas.on(Events.SELECTION_GROUP_ADDED, selectionGroupEventHandler);
      canvas.on(Events.SELECTION_GROUP_REMOVED, selectionGroupRemovedEventHandler);
    }

    return () => {
      canvas.off(Events.ZOOM_CHANGED, zoomEventHandler);
      canvas.off(Events.SELECTION_GROUP_ADDED, selectionGroupEventHandler);
      canvas.off(Events.SELECTION_GROUP_REMOVED, selectionGroupRemovedEventHandler);
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
      <Filters group={currentGroup} canvas={canvas} />

      <ToolbarGroup>
        <ToolbarItemButton tooltip="Draw Square" onClick={handleDrawingMode} active={drawingMode}>
          <Square size={20} />
        </ToolbarItemButton>

        <ToolbarItemButton tooltip="Group" onClick={handleGroup}>
          <Group size={20} />
        </ToolbarItemButton>
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <ToolbarItemButton tooltip="Zoom In" onClick={handleZoomIn}>
          <LucideZoomIn size={20} />
        </ToolbarItemButton>

        <ToolbarItemButton tooltip="Zoom Reset" onClick={handleResetZoom}>
          <span className="text-neutral-100 text-xs font-medium">{zoomValue.toFixed(1)}</span>
        </ToolbarItemButton>

        <ToolbarItemButton tooltip="Zoom Out" onClick={handleZoomOut}>
          <ZoomOut size={20} />
        </ToolbarItemButton>
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <ToolbarItemButton tooltip="Capture" onClick={handleCapture}>
          <Download size={20} />
        </ToolbarItemButton>
      </ToolbarGroup>
    </div>
  );
}
