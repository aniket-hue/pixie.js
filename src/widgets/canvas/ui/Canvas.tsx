import { useEffect, useRef, useState } from "react";
import { Canvas as CanvasClass } from "../../../core/Canvas.class";
import type { Entity } from "../../../core/ecs/base/Entity.class";
import { createImage, createRectangle } from "../../../core/factory";
import type { ImageProps } from "../../../core/factory/types";
import { rgbaToArgb } from "../../../core/lib/color";
import { Sidebar } from "../../Sidebar";
import { CanvasContext } from "../model/ctx";
import { RenderDebugPanel } from "./RenderDebugPanel";

const SCENE = {
  debug: true,
  imageGrid: true,
  rectField: true,
  overlapStack: true,
  transformShowcase: true,
  strokeShowcase: true,

  /** 400 images, for perf work only. */
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

const randomBetween = (min: number, max: number) =>
  min + random() * (max - min);
const randomInt = (min: number, max: number) =>
  Math.floor(randomBetween(min, max + 1));

/** Picsum `seed` URLs always resolve, unlike `id` URLs which have gaps. */
const imageUrl = (seed: number, size: number) =>
  `https://picsum.photos/seed/gk${seed}/${size}/${size}`;

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

function buildScene(canvas: CanvasClass) {
  const add = (entity: Entity) => canvas.add(entity);
  const addImage = (props: ImageProps) => add(createImage(props));
  let imageSeed = 0;

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
          fill: paletteColor(
            randomInt(0, PALETTE.length - 1),
            randomBetween(0.45, 1),
          ),
          angle: randomBetween(0, Math.PI * 2),
        }),
      );
    }
  }

  // Clicking the centre should resolve to the topmost entity.
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
        }),
      );
    }
  }

  // Rotated, non-uniform scales break naive bounds math.
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
        }),
      );
    }
  }

  // The fragment shader clamps strokes to 1px against scale; zoom out to check.
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
        }),
      );
    }
  }

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

    buildScene(canvas);

    let disposed = false;

    // Debug handles, driveable from the console.
    (window as any).cx = canvas;
    (window as any).fit = () => canvas.camera.fitToScene();

    // The element has no layout at construction, so fit on the first real size.
    const observer = new ResizeObserver(() => {
      if (canvas.width > 0 && canvas.height > 0) {
        observer.disconnect();
        canvas.camera.fitToScene();
      }
    });

    observer.observe(element);

    canvas.whenLoaded().then(({ failed }) => {
      if (disposed) {
        return;
      }

      failed.forEach((entity) => console.error(entity.texture?.error));
      canvas.camera.fitToScene();
    });

    console.info(`[debug scene] ${canvas.getObjects().length} top-level entities`);

    return () => {
      disposed = true;
      observer.disconnect();
      canvas.destroy();
      if ((window as any).cx === canvas) {
        delete (window as any).cx;
        delete (window as any).fit;
      }
    };
  }, []);

  return (
    <CanvasContext.Provider value={{ canvas }}>
      <div className="w-screen h-screen">
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-red-300 size-1"></div>

        <Sidebar />
        {SCENE.debug && <RenderDebugPanel />}
        <canvas className="flex-1 block w-full h-full" ref={canvasRef} />
      </div>
    </CanvasContext.Provider>
  );
}
