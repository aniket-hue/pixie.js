import { Popover, Slider } from '@mantine/core';
import { Filter } from 'lucide-react';
import { useMemo } from 'react';
import type { Canvas } from '../../../core/Canvas.class';
import type { Entity } from '../../../core/ecs/base/Entity.class';
import { ToolbarItemButton } from './toolbar';

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

  const handleFilterChange = (e: number, filter: (value: number) => void) => {
    if (!image || !image.texture) {
      return;
    }

    filter(e);
    canvas?.requestRender();
  };

  const filters = useMemo(() => {
    if (!image || !image.texture) {
      return [];
    }

    return [
      { label: 'Brightness', onChange: image.texture.setBrightness.bind(image.texture), max: 2, min: 0, defaultValue: image.texture.brightness ?? 1 },
      { label: 'Contrast', onChange: image.texture.setContrast.bind(image.texture), max: 2, min: 0, defaultValue: image.texture.contrast ?? 1 },
      { label: 'Saturation', onChange: image.texture.setSaturation.bind(image.texture), max: 2, min: 0, defaultValue: image.texture.saturation ?? 1 },
      { label: 'Hue', onChange: image.texture.setHue.bind(image.texture), max: 2, min: 0, defaultValue: image.texture.hue ?? 1 },
      { label: 'Sepia', onChange: image.texture.setSepia.bind(image.texture), max: 2, min: 0, defaultValue: image.texture.sepia ?? 1 },
      { label: 'Invert', onChange: image.texture.setInvert.bind(image.texture), max: 2, min: 0, defaultValue: image.texture.invert ?? 1 },
    ];
  }, [image]);

  return (
    <Popover trapFocus width={200} position="right" withArrow shadow="md" disabled={image === undefined}>
      <Popover.Target>
        <ToolbarItemButton tooltip="Filters" disabled={image === undefined}>
          <Filter size={20} />
        </ToolbarItemButton>
      </Popover.Target>

      <Popover.Dropdown className="!p-2 !rounded-lg">
        {filters.map((filter) => (
          <div key={filter.label}>
            <span className="text-xs">{filter.label}</span>
            <Slider
              size="sm"
              onChange={(e) => handleFilterChange(e, filter.onChange)}
              step={0.01}
              defaultValue={filter.defaultValue}
              max={filter.max}
              min={filter.min}
            />
          </div>
        ))}
      </Popover.Dropdown>
    </Popover>
  );
}
