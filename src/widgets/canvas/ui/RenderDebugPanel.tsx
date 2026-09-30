import { useEffect, useRef, useState } from 'react';
import type { Canvas } from '../../../core/Canvas.class';
import { RenderDebug, type RenderDebugFrame } from '../../../core/RenderDebug.class';
import { useCanvasContext } from '../model/ctx';
import { ActionButton, Metric } from './debugUi';
import { TexturesTab } from './TexturesTab';

type Health = ReturnType<Canvas['textureManager']['stats']> & { contextLost: boolean };

function readHealth(canvas: Canvas): Health {
  return { ...canvas.textureManager.stats(), contextLost: canvas.getCtx()?.isContextLost() ?? true };
}

const TABS = ['Frames', 'Textures'] as const;

export function RenderDebugPanel() {
  const { canvas } = useCanvasContext();
  const [enabled, setEnabled] = useState(true);
  const [expanded, setExpanded] = useState(true);
  const [tab, setTab] = useState<(typeof TABS)[number]>('Frames');
  const [culling, setCulling] = useState(true);
  const [frames, setFrames] = useState<RenderDebugFrame[]>([]);
  const [selectedFrame, setSelectedFrame] = useState<RenderDebugFrame | null>(null);
  const [health, setHealth] = useState<Health | null>(null);
  const debugRef = useRef<RenderDebug | null>(null);
  // getExtension returns null once the context is lost, so keep the handle from before.
  const loseContextRef = useRef<WEBGL_lose_context | null>(null);

  useEffect(() => {
    loseContextRef.current = canvas?.getCtx()?.getExtension('WEBGL_lose_context') ?? null;
  }, [canvas]);

  useEffect(() => {
    if (!canvas) return;

    const timer = window.setInterval(() => {
      const next = readHealth(canvas);
      setHealth((previous) => (JSON.stringify(previous) === JSON.stringify(next) ? previous : next));
    }, 200);

    return () => window.clearInterval(timer);
  }, [canvas]);

  useEffect(() => {
    if (!canvas || !enabled) return;

    const debug = new RenderDebug();
    debug.culling = culling;
    debugRef.current = debug;
    canvas.debug = debug;
    setFrames([]);
    setSelectedFrame(null);
    canvas.requestRender('RenderDebugPanel.enabled');

    // Read every 200ms so React does not add work to every drag frame.
    let lastFrameId = 0;
    const timer = window.setInterval(() => {
      const latest = debug.frames[0];
      if (!latest || latest.id === lastFrameId) return;

      lastFrameId = latest.id;
      setFrames([...debug.frames]);
    }, 200);

    return () => {
      window.clearInterval(timer);
      if (canvas.debug === debug) canvas.debug = null;
      debugRef.current = null;
    };
  }, [canvas, enabled]);

  function toggleCulling(next: boolean) {
    setCulling(next);

    if (debugRef.current) {
      debugRef.current.culling = next;
    }

    canvas?.requestRender('RenderDebugPanel.culling');
  }

  function loseContext() {
    const extension = loseContextRef.current;

    if (!extension) return;

    extension.loseContext();
    window.setTimeout(() => extension.restoreContext(), 1000);
  }

  const frame = selectedFrame ?? frames[0];

  const requests = frame?.requests.reduce((total, request) => total + request.count, 0) ?? 0;
  const instances = frame?.draws.reduce((total, draw) => total + draw.instances, 0) ?? 0;

  return (
    <section aria-label="Render debug" className="fixed right-4 top-4 z-[1001] w-[380px] max-w-[calc(100vw-2rem)] rounded-lg border border-neutral-700 bg-neutral-950/95 text-xs text-neutral-200 shadow-lg">
      <header className="flex items-center justify-between gap-3 px-4 py-3">
        <button type="button" aria-expanded={expanded} onClick={() => setExpanded(!expanded)} className="font-semibold text-white">
          Render debug {expanded ? '−' : '+'}
        </button>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />
          Capture
        </label>
      </header>

      {expanded && (
        <div role="tablist" aria-label="Debug views" className="flex gap-4 border-t border-neutral-800 px-4">
          {TABS.map((name) => (
            <button
              key={name}
              type="button"
              role="tab"
              aria-selected={tab === name}
              onClick={() => setTab(name)}
              className="-mb-px border-b-2 border-transparent py-2 text-neutral-400 hover:text-white aria-selected:border-blue-400 aria-selected:text-white"
            >
              {name}
            </button>
          ))}
        </div>
      )}

      {expanded && tab === 'Textures' && (
        <div role="tabpanel" className="max-h-[75vh] overflow-y-auto border-t border-neutral-800 px-4 py-3">
          <TexturesTab canvas={canvas} stats={health} />
        </div>
      )}

      {expanded && tab === 'Frames' && (
        <div role="tabpanel" className="max-h-[75vh] space-y-4 overflow-y-auto border-t border-neutral-800 px-4 py-3">
          <p className="text-neutral-400">WebGL draw calls. Canvas 2D overlay is excluded.</p>
          {!enabled && <p className="text-amber-300">Paused. Showing the last captured frame.</p>}
          {frame ? (
            <>
              <div className="grid grid-cols-4 gap-2">
                <Metric label="Draw calls" value={frame.draws.length} />
                <Metric label="Instances" value={instances} />
                <Metric label="Culled" value={frame.culled} />
                <Metric label="CPU ms" value={frame.cpuMs.toFixed(2)} />
              </div>
              <p className="text-neutral-400">Frame #{frame.id} · {frame.target} · {frame.width} × {frame.height} px</p>

              <div>
                <h3 className="mb-2 font-semibold text-white">Checks</h3>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="flex items-center gap-2 rounded border border-neutral-700 px-2 py-1">
                    <input type="checkbox" checked={culling} disabled={!enabled} onChange={(event) => toggleCulling(event.target.checked)} />
                    Culling
                  </label>
                  <ActionButton onClick={() => canvas?.camera.fitToScene()}>Fit scene</ActionButton>
                  <ActionButton onClick={loseContext} disabled={!loseContextRef.current || health?.contextLost}>
                    Lose context for 1s
                  </ActionButton>
                </div>
                <p className={`mt-2 ${health?.contextLost ? 'text-amber-300' : 'text-neutral-500'}`}>
                  WebGL context: {health?.contextLost ? 'lost, waiting for restore' : 'ok'}
                </p>
              </div>

              <div>
                <h3 className="mb-2 font-semibold text-white">Redraw requests ({requests})</h3>
                <table className="w-full text-left">
                  <thead className="text-neutral-500"><tr><th className="pb-1 font-normal">Initiator</th><th className="text-right font-normal">Count</th></tr></thead>
                  <tbody>
                    {frame.requests.map((request) => (
                      <tr key={request.source}><td className="break-all py-1 font-mono">{request.source}</td><td className="text-right tabular-nums">{request.count}</td></tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-2 text-neutral-500">These requests scheduled the captured redraw.</p>
              </div>

              <div>
                <h3 className="mb-2 font-semibold text-white">SceneRenderer batches</h3>
                <table className="w-full text-left tabular-nums">
                  <thead className="text-neutral-500"><tr><th className="font-normal">Call</th><th className="font-normal">Objects</th><th className="font-normal">Pages</th><th className="font-normal">Submitted because</th></tr></thead>
                  <tbody>
                    {frame.draws.map((draw, index) => (
                      <tr key={index}>
                        <td className="py-1">{index + 1}</td><td>{draw.instances}</td><td>{draw.pages}</td><td>{draw.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!frame.draws.length && <p className="mt-2 text-neutral-500">No scene draw calls.</p>}
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="font-semibold text-white">Recent frames</h3>
                  <button type="button" className="text-blue-300" onClick={() => setSelectedFrame(null)}>Follow latest</button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {frames.map((recent) => (
                    <button type="button" key={recent.id} title={`${recent.target}: ${recent.requests.map((request) => request.source).join(', ')}`} aria-pressed={frame.id === recent.id} onClick={() => setSelectedFrame(recent)} className="rounded border border-neutral-700 px-2 py-1 aria-pressed:border-blue-400 aria-pressed:bg-blue-950">
                      #{recent.id}: {recent.draws.length}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : <p className="text-neutral-400">Waiting for a redraw.</p>}
          <p className="text-neutral-500">CPU time measures command submission, not GPU completion.</p>
        </div>
      )}
    </section>
  );
}
