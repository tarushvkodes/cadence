import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Fixture, TimedEvent, TurnRequest } from '../src/domain/agent.ts';
import { MODELS } from '../src/domain/agent.ts';
import { runTurn } from './agent.ts';
import { parseTurnRequest } from './protocol.ts';

const PORT = Number(process.env.CADENCE_BRIDGE_PORT ?? 8741);
const HOST = '127.0.0.1';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FIXTURES = join(ROOT, 'public', 'fixtures');
const MAX_BODY = 2_000_000;

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > MAX_BODY) throw new Error('Request body too large');
    chunks.push(chunk as Buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
}

/** Append one recorded turn to public/fixtures/<flow>.json. Turn 0 starts a fresh file. */
async function saveRecording(request: TurnRequest, events: TimedEvent[]) {
  if (!request.record) return;
  const { flow, turnIndex } = request.record;
  const file = join(FIXTURES, `${flow}.json`);
  let turns: Fixture['turns'] = [];
  if (turnIndex > 0) {
    const existing = JSON.parse(await readFile(file, 'utf8')) as Fixture;
    turns = existing.turns.slice(0, turnIndex);
  }
  const fixture: Fixture = {
    version: 1,
    flow,
    model: request.model,
    recordedAt: new Date().toISOString(),
    today: request.snapshot.today,
    turns: [...turns, { message: request.message, events }],
  };
  await mkdir(FIXTURES, { recursive: true });
  await writeFile(file, `${JSON.stringify(fixture, null, 2)}\n`);
  console.log(`[bridge] recorded ${flow} turn ${turnIndex} (${events.length} events) to public/fixtures/${flow}.json`);
}

async function handleTurn(req: IncomingMessage, res: ServerResponse) {
  let body: unknown;
  try {
    body = await readJson(req);
  } catch (err) {
    return sendJson(res, 400, { error: err instanceof Error ? err.message : 'Bad request' });
  }
  const parsed = parseTurnRequest(body);
  if (!parsed.ok) return sendJson(res, 400, { error: parsed.error });
  const request = parsed.value;

  res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' });
  const abort = new AbortController();
  res.on('close', () => abort.abort());

  const started = Date.now();
  const recorded: TimedEvent[] = [];
  console.log(`[bridge] turn on ${request.model}: "${request.message.slice(0, 80)}"`);
  for await (const event of runTurn(request, abort.signal)) {
    const timed: TimedEvent = { t: Date.now() - started, event };
    recorded.push(timed);
    if (!res.writableEnded) res.write(`data: ${JSON.stringify(timed)}\n\n`);
    if (event.type === 'tool_finished') console.log(`[bridge]   ${event.tool}: ${event.summary}`);
    if (event.type === 'error') console.log(`[bridge]   error: ${event.message}`);
  }
  if (!abort.signal.aborted && recorded.at(-1)?.event.type === 'done') await saveRecording(request, recorded);
  console.log(`[bridge] turn finished in ${((Date.now() - started) / 1000).toFixed(1)}s`);
  res.end();
}

const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://${HOST}`);
  if (req.method === 'GET' && url.pathname === '/api/health') {
    return sendJson(res, 200, { ok: true, name: 'cadence-bridge', models: MODELS.map((m) => m.id) });
  }
  if (req.method === 'POST' && url.pathname === '/api/turn') {
    handleTurn(req, res).catch((err) => {
      console.error('[bridge] turn failed', err);
      if (!res.headersSent) sendJson(res, 500, { error: 'The bridge hit an unexpected error.' });
      else res.end();
    });
    return;
  }
  sendJson(res, 404, { error: 'Not found' });
});

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[bridge] Port ${PORT} is already in use by another program. Start Cadence with a different port, for example:\n  CADENCE_BRIDGE_PORT=8742 npm run dev`);
    process.exit(1);
  }
  throw err;
});

server.listen(PORT, HOST, () => {
  console.log(`[bridge] Cadence agent bridge on http://${HOST}:${PORT} (uses your Claude Code login)`);
});
