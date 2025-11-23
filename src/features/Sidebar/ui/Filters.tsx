import { Popover, Slider } from '@mantine/core';
import { Filter } from 'lucide-react';
import { useMemo } from 'react';
import type { Canvas } from '../../../core/Canvas.class';
import type { Entity } from '../../../core/ecs/base/Entity.class';
import { ToolbarGroup, ToolbarItemButton } from './toolbar';

export function Filters({ group, canvas }: { group: Entity | null; canvas: Canvas | null }) {
  const image = useMemo(() => {
    if (!group || group.hierarchy.children.length > 1) {
      return undefined;
    }

    const child = group.hierarchy.children[0];

    if (!child.has('texture')) {
      return undefined;
    }

    return child;
  }, [group]);

  function handleBrightnessChange(e: number) {
    if (!image || !image.texture) {
      return;
    }

    image.texture.setSepia(24);
    canvas?.requestRender();
  }

  return (
    <Popover trapFocus width={200} position="right" withArrow shadow="md" disabled={image === undefined}>
      <Popover.Target>
        <ToolbarItemButton tooltip="Filters" disabled={image === undefined}>
          <Filter size={20} />
        </ToolbarItemButton>
      </Popover.Target>

      <Popover.Dropdown>
        <div>
          <span>Brightness</span>
          <Slider onChange={handleBrightnessChange} step={0.01} max={1} min={0} />
        </div>
      </Popover.Dropdown>
    </Popover>
  );
}
