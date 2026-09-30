import { useEffect, useState } from 'react';
import { RenderDebug, type RenderDebugFrame } from '../../../core/RenderDebug.class';
import { useCanvasContext } from '../model/ctx';

export function RenderDebugPanel() {
  const { canvas } = useCanvasContext();
  const [enabled, setEnabled] = useState(true);
  const [expanded, setExpanded] = useState(true);
  const [frames, setFrames] = useState<RenderDebugFrame[]>([]);
  const [selectedFrame, setSelectedFrame] = useState<RenderDebugFrame | null>(null);

  useEffect(() => {
    if (!canvas || !enabled) return;

    const debug = new RenderDebug();
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
    };
  }, [canvas, enabled]);

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
        <div className="max-h-[75vh] space-y-4 overflow-y-auto border-t border-neutral-800 px-4 py-3">
          <p className="text-neutral-400">WebGL draw calls. Canvas 2D overlay is excluded.</p>
          {!enabled && <p className="text-amber-300">Paused. Showing the last captured frame.</p>}
          {frame ? (
            <>
              <div className="grid grid-cols-3 gap-2">
                <Metric label="Draw calls" value={frame.draws.length} />
                <Metric label="Instances" value={instances} />
                <Metric label="CPU render" value={`${frame.cpuMs.toFixed(2)} ms`} />
              </div>
              <p className="text-neutral-400">Frame #{frame.id} · {frame.target} · {frame.width} × {frame.height} px</p>

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
                  <thead className="text-neutral-500"><tr><th className="font-normal">Call</th><th className="font-normal">Objects</th><th className="font-normal">Atlas</th><th className="font-normal">Submitted because</th></tr></thead>
                  <tbody>
                    {frame.draws.map((draw, index) => (
                      <tr key={index}>
                        <td className="py-1">{index + 1}</td><td>{draw.instances}</td><td>{draw.atlasBin ?? 'Unknown'}</td><td>{draw.reason}</td>
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

function Metric({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded bg-neutral-900 p-2"><div className="text-neutral-400">{label}</div><div className="mt-1 text-lg font-semibold tabular-nums text-white">{value}</div></div>;
}
