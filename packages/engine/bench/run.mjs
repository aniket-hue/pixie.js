import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const VITE_PORT = 5299;
const DEBUG_PORT = 9334;

const root = fileURLToPath(new URL('..', import.meta.url));
const out = fileURLToPath(new URL('./results/', import.meta.url));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const server = await createServer({ root, logLevel: 'error', server: { port: VITE_PORT, strictPort: true } });
await server.listen();

const profile = await mkdtemp(join(tmpdir(), 'gk-bench-'));
const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${profile}`,
    '--enable-gpu',
    '--use-angle=metal',
    '--ignore-gpu-blocklist',
    `http://localhost:${VITE_PORT}/bench/index.html`,
  ],
  { stdio: 'ignore' },
);

try {
  let target;
  for (let i = 0; i < 100 && !target; i++) {
    await sleep(200);
    try {
      const targets = await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json`)).json();
      target = targets.find((t) => t.type === 'page' && t.url.includes('/bench/'));
    } catch {}
  }
  if (!target) throw new Error('Chrome did not open the bench page');

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve);
    ws.addEventListener('error', reject);
  });

  let nextId = 1;
  const pending = new Map();
  ws.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.id) {
      pending.get(message.id)?.(message);
      pending.delete(message.id);
    } else if (message.method === 'Runtime.consoleAPICalled') {
      console.log(message.params.args.map((arg) => arg.value ?? arg.description).join(' '));
    } else if (message.method === 'Runtime.exceptionThrown') {
      console.error(message.params.exceptionDetails.exception?.description);
    }
  });

  const send = (method, params = {}) =>
    new Promise((resolve) => {
      const id = nextId++;
      pending.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });

  const evaluate = async (expression, awaitPromise = false) => {
    const response = await send('Runtime.evaluate', { expression, awaitPromise, returnByValue: true });
    if (response.result?.exceptionDetails) throw new Error(response.result.exceptionDetails.exception?.description ?? 'evaluate failed');
    return response.result?.result?.value;
  };

  await send('Runtime.enable');
  for (let i = 0; i < 100 && (await evaluate('typeof window.runBench')) !== 'function'; i++) await sleep(200);

  const { renderer, rows } = await evaluate('window.runBench()', true);

  await mkdir(out, { recursive: true });
  for (const row of rows) {
    if (!row.shot) continue;
    const file = `${row.scene}__${row.strategy}`.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    await writeFile(join(out, `${file}.jpg`), Buffer.from(row.shot.split(',')[1], 'base64'));
    delete row.shot;
  }
  await writeFile(join(out, 'results.json'), JSON.stringify({ renderer, date: new Date().toISOString(), rows }, null, 2));

  const fmt = (value, digits = 2) => (typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : '-');
  const columns = [
    ['scene', (r) => r.scene],
    ['strategy', (r) => r.strategy],
    ['prep ms', (r) => fmt(r.prepareMs, 0)],
    ['GPU MB', (r) => fmt(r.gpuMB, 0)],
    ['draws', (r) => (r.draws ?? '-').toString()],
    ['cpu ms', (r) => fmt(r.cpuMs)],
    ['gpu ms', (r) => fmt(r.gpuMs)],
    ['gpu p95', (r) => fmt(r.gpuP95)],
    ['wall ms', (r) => fmt(r.wallMs)],
    ['note', (r) => r.error ? `ERROR: ${r.error}` : r.note ?? ''],
  ];
  const table = [columns.map(([name]) => name), ...rows.map((row) => columns.map(([, get]) => get(row)))];
  const widths = columns.map((_, i) => Math.max(...table.map((line) => line[i].length)));

  console.log(`\n${renderer}\n`);
  table.forEach((line, index) => {
    console.log(line.map((cell, i) => cell.padEnd(widths[i])).join('  '));
    if (index === 0) console.log(widths.map((w) => '-'.repeat(w)).join('  '));
  });
  console.log(`\nSaved results.json and screenshots to ${out}`);

  ws.close();
} finally {
  const exited = new Promise((resolve) => chrome.once('exit', resolve));
  chrome.kill();
  await exited;
  await server.close();
  await rm(profile, { recursive: true, force: true });
}
