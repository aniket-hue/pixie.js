import { Popover, Slider } from '@mantine/core';
import { Sparkles } from 'lucide-react';
import { useMemo } from 'react';
import type { Canvas } from '../../../core/Canvas.class';
import type { Entity } from '../../../core/ecs/base/Entity.class';
import { ToolbarItemButton } from './toolbar';

export function Filters({ selected, canvas }: { selected: Entity[]; canvas: Canvas | null }) {
  const image = useMemo(() => {
    if (selected.length !== 1 || !selected[0].has('texture')) {
      return undefined;
    }

    return selected[0];
  }, [selected]);

  const handleFilterChange = (e: number, filter: (value: number) => void) => {
    if (!image || !image.texture) {
      return;
    }

    filter(e);
    canvas?.requestRender('Filters.change');
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
          <Sparkles size={20} />
        </ToolbarItemButton>
      </Popover.Target>

      <Popover.Dropdown className="!p-2 !rounded-lg">
        {filters.map((filter) => (
          <div key={filter.label}>
            <span className="text-xs">{filter.label}</span>
            <Slider
              size="sm"
              onChange={(e) => handleFilterChange(e, filter.onChange)}
              step={0.1}
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
