import { useEffect, useRef, useState } from 'react';
import type { Canvas } from '../../../core/Canvas.class';
import type { Entity } from '../../../core/ecs/base/Entity.class';
import { createImage } from '../../../core/factory';
import { m3 } from '../../../core/lib/math';
import type { BoundingBox } from '../../../types';
import { ActionButton, Metric, NumberField, Segmented, TextField, formatBytes } from './debugUi';

const LAYOUTS = ['grid', 'row', 'scatter'] as const;
type Layout = (typeof LAYOUTS)[number];

// Top-left of the photo wall, below the demo scene.
const ORIGIN = { x: -1800, y: -5000 };
// Picsum serves at most 5000 px per side.
const MAX_SIDE = 5000;

type Stats = ReturnType<Canvas['textureStats']>;
type Detail = { pages: Stats['pageUsage']; loads: Stats['recentLoads'] };

function percentile(values: number[], p: number) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
}

/** Whole number from an input box, clamped. Falls back while the box is empty or half-typed. */
function readNumber(value: string, min: number, max: number, fallback: number) {
  const parsed = Math.round(Number.parseFloat(value));
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

/** Centre and angle of every photo. Cells are sized by the biggest photo so mixed sizes never overlap. */
function placements(layout: Layout, sizes: Array<{ width: number; height: number }>, columns: number, gap: number) {
  const cellWidth = Math.max(...sizes.map((size) => size.width)) + gap;
  const cellHeight = Math.max(...sizes.map((size) => size.height)) + gap;

  if (layout === 'scatter') {
    const side = Math.ceil(Math.sqrt(sizes.length)) * 1.4;
    return sizes.map(() => ({
      x: ORIGIN.x + Math.random() * side * cellWidth,
      y: ORIGIN.y - Math.random() * side * cellHeight,
      angle: (Math.random() - 0.5) * (Math.PI / 3),
    }));
  }

  const perRow = layout === 'row' ? sizes.length : columns;
  return sizes.map((_, index) => ({
    x: ORIGIN.x + (index % perRow) * cellWidth,
    y: ORIGIN.y - Math.floor(index / perRow) * cellHeight,
    angle: 0,
  }));
}

const ms = (value: number) => `${Math.round(value)} ms`;
const mb = (bytes: number) => Math.round(bytes / 2 ** 20);

export function TexturesTab({ canvas, stats }: { canvas: Canvas | null; stats: Stats | null }) {
  const [width, setWidth] = useState('4000');
  const [height, setHeight] = useState('2667');
  const [count, setCount] = useState('25');
  const [drawWidth, setDrawWidth] = useState('400');
  const [url, setUrl] = useState('');
  const [layout, setLayout] = useState<Layout>('grid');
  const [columns, setColumns] = useState('10');
  const [gap, setGap] = useState('40');
  const [skipped, setSkipped] = useState(0);
  const [detail, setDetail] = useState<Detail>({ pages: [], loads: [] });
  const photos = useRef<Entity[]>([]);
  const nextSeed = useRef(0);

  useEffect(() => {
    if (!canvas) return;

    const read = () => {
      const { pageUsage, recentLoads } = canvas.textureStats();
      setDetail({ pages: pageUsage, loads: recentLoads });
    };
    read();
    const timer = window.setInterval(read, 500);

    return () => window.clearInterval(timer);
  }, [canvas]);

  const livePhotos = () => photos.current.filter((entity) => entity.world);

  function framePhotos() {
    const placed = livePhotos();
    if (!canvas || !placed.length) return;

    const bounds: BoundingBox = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
    for (const entity of placed) {
      const box = entity.bounds.updateBounds();
      bounds.minX = Math.min(bounds.minX, box.minX);
      bounds.minY = Math.min(bounds.minY, box.minY);
      bounds.maxX = Math.max(bounds.maxX, box.maxX);
      bounds.maxY = Math.max(bounds.maxY, box.maxY);
    }

    canvas.camera.fitToBounds(bounds);
  }

  function arrange() {
    if (!canvas) return;

    const roots = livePhotos().filter((entity) => !entity.hierarchy.parent);
    setSkipped(livePhotos().length - roots.length);
    if (!roots.length) return;

    const spots = placements(
      layout,
      roots.map((entity) => ({ width: entity.size.width, height: entity.size.height })),
      readNumber(columns, 1, 1000, 10),
      readNumber(gap, 0, 10_000, 40),
    );

    roots.forEach((entity, index) => {
      const { x, y, angle } = spots[index];
      entity.matrix.setLocalMatrix(m3.compose({ tx: x, ty: y, sx: 1, sy: 1, r: angle }));
      entity.matrix.setWorldMatrix();
    });

    canvas.requestRender('TexturesTab.arrange');
    framePhotos();
  }

  function addPhotos() {
    if (!canvas) return;

    const sourceWidth = readNumber(width, 16, MAX_SIDE, 4000);
    const sourceHeight = readNumber(height, 16, MAX_SIDE, 2667);
    const drawnWidth = readNumber(drawWidth, 10, 10_000, 400);
    const drawnHeight = Math.round((drawnWidth * sourceHeight) / sourceWidth);
    const custom = url.trim();

    const added = Array.from({ length: readNumber(count, 1, 1000, 25) }, () =>
      createImage({
        x: 0,
        y: 0,
        width: drawnWidth,
        height: drawnHeight,
        url: custom || `https://picsum.photos/seed/gk-hq-${nextSeed.current++}/${sourceWidth}/${sourceHeight}`,
      }),
    );

    canvas.add(...added);
    photos.current.push(...added);

    arrange();
  }

  function removePhotos() {
    if (!canvas) return;

    canvas.remove(...livePhotos());
    photos.current = [];
    setSkipped(0);
  }

  function removeHalfOfImages() {
    if (!canvas) return;

    const images = canvas.getObjects().filter((entity) => entity.texture);
    canvas.remove(...images.filter((_, index) => index % 2 === 0));
  }

  const loaded = detail.loads.filter((load) => !load.error);
  const fetchDecode = loaded.map((load) => load.fetchDecodeMs);
  const thumb = loaded.flatMap((load) => (load.thumbMs === undefined ? [] : [load.thumbMs]));

  return (
    <div className="space-y-4">
      <div>
        <h3 className="mb-2 font-semibold text-white">Add images</h3>
        <div className="flex flex-wrap items-end gap-2">
          <NumberField label="Width" value={width} onChange={setWidth} min={16} max={MAX_SIDE} />
          <span className="pb-1.5 text-neutral-500">×</span>
          <NumberField label="Height" value={height} onChange={setHeight} min={16} max={MAX_SIDE} />
          <NumberField label="Count" value={count} onChange={setCount} min={1} max={1000} />
          <NumberField label="Drawn at" value={drawWidth} onChange={setDrawWidth} min={10} max={10_000} />
        </div>
        <div className="mt-2">
          <TextField label="Image URL (optional)" value={url} onChange={setUrl} placeholder="Random Picsum photo per image" />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <ActionButton onClick={addPhotos} disabled={!canvas}>
            Add
          </ActionButton>
          <ActionButton onClick={removePhotos}>Remove photos</ActionButton>
          <ActionButton onClick={removeHalfOfImages}>Remove half of images</ActionButton>
        </div>
        <p className="mt-2 text-neutral-500">
          Width × height is the source size (Picsum max {MAX_SIDE} px). "Drawn at" is the width on the canvas. A URL is fetched once and shared by every copy.
        </p>
      </div>

      <div>
        <h3 className="mb-2 font-semibold text-white">Arrange</h3>
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1 text-neutral-400">
            Layout
            <Segmented options={LAYOUTS} value={layout} onChange={setLayout} />
          </div>
          <NumberField label="Columns" value={columns} onChange={setColumns} min={1} max={1000} disabled={layout !== 'grid'} />
          <NumberField label="Gap" value={gap} onChange={setGap} min={0} max={10_000} />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <ActionButton onClick={arrange} disabled={!canvas}>
            Arrange
          </ActionButton>
          <ActionButton onClick={framePhotos}>Frame photos</ActionButton>
        </div>
        {skipped > 0 && <p className="mt-2 text-amber-300">Skipped {skipped} photos inside a group. Ungroup them and arrange again.</p>}
      </div>

      {stats && (
        <div>
          <div className="grid grid-cols-3 gap-2">
            <Metric label="Images" value={stats.loading ? `${stats.images} +${stats.loading}` : stats.images} />
            <Metric label="Failed" value={stats.failed} />
            <Metric label="Pages" value={`${stats.pages} / ${stats.pageBudget}`} />
            <Metric label="GPU memory" value={formatBytes(stats.gpuBytes)} />
            <Metric label="Tiles" value={stats.chunks} />
            <Metric label="Streaming" value={stats.queued} />
            <Metric label="Evictions" value={stats.evictions} />
            <Metric label="Tile ms" value={`${Math.round(stats.chunkP50)} / ${Math.round(stats.chunkP95)}`} />
            <Metric label="Decoded (CPU)" value={`${mb(stats.cpuBytes)} MB`} />
          </div>
          <p className="mt-2 text-neutral-500">
            {stats.pinned} thumbnails stay resident. Tile ms is p50 / p95 to crop and upload one tile.{stats.overBudget ? ` Over budget ${stats.overBudget} times.` : ''}
          </p>
        </div>
      )}

      <div>
        <h3 className="mb-2 font-semibold text-white">Pages ({detail.pages.length})</h3>
        {detail.pages.length ? (
          <table className="w-full text-left tabular-nums">
            <thead className="text-neutral-500">
              <tr>
                <th className="pb-1 font-normal">Page</th>
                <th className="font-normal">Slot</th>
                <th className="font-normal">Used</th>
                <th className="w-2/5 font-normal">Filled</th>
              </tr>
            </thead>
            <tbody>
              {detail.pages.map((page) => (
                <tr key={page.page}>
                  <td className="py-1">{page.page}</td>
                  <td>{page.size} px</td>
                  <td>
                    {page.used} / {page.capacity}
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 rounded bg-neutral-800">
                        <div className="h-full rounded bg-blue-400" style={{ width: `${(page.used / page.capacity) * 100}%` }} />
                      </div>
                      <span className="w-9 text-right">{Math.round((page.used / page.capacity) * 100)}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-neutral-500">No pages yet.</p>
        )}
        <p className="mt-2 text-neutral-500">Each 2048 px page (16 MB) holds one slot size. Empty pages are freed.</p>
      </div>

      <div>
        <h3 className="mb-2 font-semibold text-white">Recent loads</h3>
        {loaded.length > 0 && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <Metric label="Fetch + decode (ms)" value={`${Math.round(percentile(fetchDecode, 0.5))} / ${Math.round(percentile(fetchDecode, 0.95))}`} />
              <Metric label="First pixels (ms)" value={`${Math.round(percentile(thumb, 0.5))} / ${Math.round(percentile(thumb, 0.95))}`} />
            </div>
            <p className="mt-1 mb-2 text-neutral-500">p50 / p95 over the last {loaded.length} loads.</p>
          </>
        )}
        {detail.loads.length ? (
          <table className="w-full text-left tabular-nums">
            <thead className="text-neutral-500">
              <tr>
                <th className="pb-1 font-normal">Size</th>
                <th className="font-normal">Fetch + decode</th>
                <th className="font-normal">First pixels</th>
              </tr>
            </thead>
            <tbody>
              {detail.loads.slice(0, 12).map((load, index) => (
                <tr key={`${load.url}-${index}`} title={load.error ?? load.url}>
                  <td className="py-1">{load.width ? `${load.width} × ${load.height}` : '-'}</td>
                  <td>{ms(load.fetchDecodeMs)}</td>
                  <td className={load.error ? 'text-amber-300' : ''}>{load.error ? 'failed' : load.thumbMs === undefined ? '…' : ms(load.thumbMs)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-neutral-500">No loads yet.</p>
        )}
        <p className="mt-2 text-neutral-500">First pixels is the time until the thumbnail is on the GPU. Hover a failed row for the reason.</p>
      </div>
    </div>
  );
}
