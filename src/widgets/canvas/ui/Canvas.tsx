import { useEffect, useRef, useState } from 'react';
import { Canvas as CanvasClass } from '../../../core/Canvas.class';
import type { Entity } from '../../../core/ecs/base/Entity.class';
import { createImage, createRectangle } from '../../../core/factory';
import { rgbaToArgb } from '../../../core/lib/color';
import { Sidebar } from '../../Sidebar';
import { CanvasContext } from '../model/ctx';

/**
 * Debug scene configuration.
 *
 * This is a development harness, not product code. It exists to exercise the
 * renderer across a spread of entity shapes, sizes, rotations, colors and
 * texture states so that picking, marquee selection, transform controls,
 * atlas packing and instanced draws all have something to chew on.
 *
 * Flip these to isolate a subsystem while debugging.
 */
const SCENE = {
  imageGrid: true,
  rectField: true,
  overlapStack: true,
  transformShowcase: true,
  strokeShowcase: true,

  /** 20x20 image grid at wide spacing. Heavy — for perf/culling work only. */
  stressGrid: false,
} as const;

/** Deterministic PRNG (mulberry32) so reloads produce an identical scene. */
function makeRandom(seed: number) {
  let a = seed;

  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;

    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const random = makeRandom(0x9e3779b9);

const randomBetween = (min: number, max: number) => min + random() * (max - min);
const randomInt = (min: number, max: number) => Math.floor(randomBetween(min, max + 1));

/** Picsum `seed` URLs always resolve, unlike `id` URLs which have gaps. */
const imageUrl = (seed: number, size: number) => `https://picsum.photos/seed/gk${seed}/${size}/${size}`;

const PALETTE = [
  [239, 68, 68], // red
  [249, 115, 22], // orange
  [234, 179, 8], // amber
  [34, 197, 94], // green
  [20, 184, 166], // teal
  [59, 130, 246], // blue
  [139, 92, 246], // violet
  [236, 72, 153], // pink
] as const;

function paletteColor(index: number, alpha = 1) {
  const [r, g, b] = PALETTE[index % PALETTE.length];

  return rgbaToArgb(r, g, b, alpha);
}

/**
 * Builds the debug scene.
 *
 * Rectangles are added synchronously. Images are added synchronously too — the
 * entity exists immediately and the renderer falls back to a placeholder size
 * until the texture resolves — and each pending texture schedules a coalesced
 * re-render as it lands. We deliberately do not `Promise.all` the texture
 * promises: `createImage` never rejects its promise on a failed load, so a
 * single dead URL would hang the whole scene.
 */
function buildScene(canvas: CanvasClass) {
  const add = (entity: Entity) => canvas.world.addEntity(entity);
  const pending: Promise<Entity>[] = [];
  let imageSeed = 0;

  const addImage = (props: Parameters<typeof createImage>[0]) => {
    const { entity, promise } = createImage(props)();

    add(entity);
    pending.push(promise);

    return entity;
  };

  // ── Image grid ──────────────────────────────────────────────────────────
  // Uniform textured entities. Exercises atlas packing and UV mapping.
  if (SCENE.imageGrid) {
    const cols = 8;
    const rows = 6;
    const spacing = 260;
    const originX = -((cols - 1) * spacing) / 2;
    const originY = -((rows - 1) * spacing) / 2;

    for (let col = 0; col < cols; col++) {
      for (let row = 0; row < rows; row++) {
        addImage({
          x: originX + col * spacing,
          y: originY + row * spacing,
          width: 200,
          height: 200,
          url: imageUrl(imageSeed++, 200),
        });
      }
    }
  }

  // ── Rectangle field ─────────────────────────────────────────────────────
  // Untextured entities across a spread of sizes, colors and rotations.
  if (SCENE.rectField) {
    const fieldX = 2600;

    for (let i = 0; i < 60; i++) {
      const size = randomBetween(60, 260);

      add(
        createRectangle({
          x: fieldX + randomBetween(-1000, 1000),
          y: randomBetween(-1000, 1000),
          width: size,
          height: size * randomBetween(0.4, 1.6),
          fill: paletteColor(randomInt(0, PALETTE.length - 1), randomBetween(0.45, 1)),
          angle: randomBetween(0, Math.PI * 2),
        })(),
      );
    }
  }

  // ── Overlap stack ───────────────────────────────────────────────────────
  // Concentric, semi-transparent, deliberately overlapping. This is the case
  // for debugging hit-testing order and z-ordering: clicking the centre should
  // resolve to the topmost entity.
  if (SCENE.overlapStack) {
    const stackY = -2400;

    for (let i = 0; i < 12; i++) {
      const size = 700 - i * 50;

      add(
        createRectangle({
          x: i * 18,
          y: stackY + i * 18,
          width: size,
          height: size,
          fill: paletteColor(i, 0.55),
          angle: (i * Math.PI) / 24,
        })(),
      );
    }
  }

  // ── Transform showcase ──────────────────────────────────────────────────
  // Pre-rotated and non-uniformly scaled entities. These are what break naive
  // bounds math, so they belong in the default scene.
  if (SCENE.transformShowcase) {
    const showcaseY = 2400;

    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 8;

      addImage({
        x: -1400 + i * 380,
        y: showcaseY,
        width: 240,
        height: 240,
        url: imageUrl(imageSeed++, 240),
        angle,
        scaleX: randomBetween(0.6, 1.5),
        scaleY: randomBetween(0.6, 1.5),
      });

      add(
        createRectangle({
          x: -1400 + i * 380,
          y: showcaseY + 500,
          width: 200,
          height: 200,
          fill: paletteColor(i, 0.9),
          angle: -angle,
          scaleX: randomBetween(0.6, 1.8),
          scaleY: randomBetween(0.6, 1.8),
        })(),
      );
    }
  }

  // ── Stroke showcase ─────────────────────────────────────────────────────
  // Ramps stroke width, which the fragment shader treats specially (it clamps
  // to a 1px minimum against the current scale). Zoom out hard to check it.
  if (SCENE.strokeShowcase) {
    const strokeY = -3800;

    for (let i = 0; i < 10; i++) {
      add(
        createRectangle({
          x: -1600 + i * 360,
          y: strokeY,
          width: 240,
          height: 240,
          fill: paletteColor(i, 0.25),
          stroke: paletteColor(i, 1),
          strokeWidth: i * 3,
        })(),
      );
    }
  }

  // ── Stress grid ─────────────────────────────────────────────────────────
  // 400 images at wide spacing. Off by default; turn on for culling and
  // instance-buffer work. Requires zooming far out to see in full.
  if (SCENE.stressGrid) {
    for (let i = 0; i < 20; i++) {
      for (let j = 0; j < 20; j++) {
        addImage({
          x: 8000 + i * 4000,
          y: j * 4000,
          width: 1000,
          height: 1000,
          url: imageUrl(imageSeed++, 100),
        });
      }
    }
  }

  return pending;
}

/**
 * Resizes the drawing buffer to the element's laid-out size and repositions the
 * overlay canvas on top of it.
 *
 * `Canvas.resize()` is only ever called from the `Canvas` constructor, which in
 * React runs before layout has settled — so `clientWidth` is 0 and the drawing
 * buffer gets sized to 0x0, rendering nothing. The overlay canvas has the same
 * problem: its CSS box is captured once via `getBoundingClientRect()` at
 * construction, so it needs repositioning too, not just resizing.
 */
function syncViewport(canvas: CanvasClass) {
  canvas.resize();

  const rect = canvas.element.getBoundingClientRect();
  const overlay = canvas.topCanvas;

  if (overlay) {
    overlay.style.width = `${rect.width}px`;
    overlay.style.height = `${rect.height}px`;
    overlay.style.top = `${rect.top}px`;
    overlay.style.left = `${rect.left}px`;
  }
}

export function Canvas() {
  const [canvas, setCanvas] = useState<CanvasClass | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) {
      return;
    }

    const element = canvasRef.current;
    const canvas = new CanvasClass(element);

    setCanvas(canvas);

    const pending = buildScene(canvas);

    // Coalesce the re-renders that land as textures resolve, so 60+ image
    // loads do not schedule 60+ separate animation frames.
    let scheduled = false;

    const scheduleRender = () => {
      if (scheduled) {
        return;
      }

      scheduled = true;

      queueMicrotask(() => {
        scheduled = false;
        canvas.requestRender();
      });
    };

    // Debug handles, driveable from the console.
    (window as any).cx = canvas;
    (window as any).fit = () => canvas.camera.fitToScene();

    // The element has no layout at construction time, so the first observation
    // is what actually gives the drawing buffer a size. Fit once then, and
    // again once every texture has settled and the image entities have taken
    // on their real dimensions.
    let framed = false;

    const observer = new ResizeObserver(() => {
      syncViewport(canvas);

      if (!framed && canvas.width > 0 && canvas.height > 0) {
        framed = true;
        canvas.camera.fitToScene();
      }

      canvas.requestRender();
    });

    observer.observe(element);

    let settled = 0;

    pending.forEach((promise) => {
      promise
        .catch(() => {})
        .finally(() => {
          settled++;

          if (settled === pending.length) {
            canvas.camera.fitToScene();
          }

          scheduleRender();
        });
    });

    console.info(`[debug scene] ${canvas.world.getEntities().size} entities, ${pending.length} textures pending`);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <CanvasContext.Provider value={{ canvas }}>
      <div className="w-screen h-screen">
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-red-300 size-1"></div>

        <Sidebar />
        <canvas className="flex-1 block w-full h-full" ref={canvasRef} />
      </div>
    </CanvasContext.Provider>
  );
}
