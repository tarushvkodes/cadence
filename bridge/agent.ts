import { randomUUID } from 'node:crypto';
import { createSdkMcpServer, query, tool, type SDKMessage } from '@anthropic-ai/claude-agent-sdk';
import { isToolName, TOOL_NAMES, type AgentEvent, type ToolName, type TurnRequest } from '../src/domain/agent.ts';
import { TOOL_DESCRIPTIONS, toolShapes } from '../src/agent/schemas.ts';
import { SYSTEM_PROMPT } from '../src/agent/systemPrompt.ts';
import { runTool, type ToolContext, type ToolInputs } from '../src/agent/tools.ts';
import { buildTurnPrompt } from '../src/agent/turnPrompt.ts';

const SERVER_NAME = 'cadence';
const PREFIX = `mcp__${SERVER_NAME}__`;

/** A tiny async queue: tool handlers and the SDK loop both push, the HTTP layer pulls. */
class EventQueue {
  private items: AgentEvent[] = [];
  private waiting: ((value: IteratorResult<AgentEvent>) => void) | null = null;
  private closed = false;

  push(event: AgentEvent) {
    if (this.closed) return;
    if (this.waiting) {
      this.waiting({ value: event, done: false });
      this.waiting = null;
    } else this.items.push(event);
  }

  close() {
    this.closed = true;
    this.waiting?.({ value: undefined, done: true });
    this.waiting = null;
  }

  async *drain(): AsyncGenerator<AgentEvent> {
    while (true) {
      const next = this.items.shift();
      if (next) {
        yield next;
        continue;
      }
      if (this.closed) return;
      const result = await new Promise<IteratorResult<AgentEvent>>((resolve) => (this.waiting = resolve));
      if (result.done) return;
      yield result.value;
    }
  }
}

function toolUseIdFrom(extra: unknown): string | null {
  if (typeof extra !== 'object' || extra === null) return null;
  const meta = (extra as { _meta?: Record<string, unknown> })._meta;
  const id = meta?.['claudecode/toolUseId'];
  return typeof id === 'string' ? id : null;
}

/** The Claude Code CLI child must not think it is nested inside another Claude Code session. */
function childEnv(): Record<string, string | undefined> {
  const env: Record<string, string | undefined> = { ...process.env, CLAUDE_AGENT_SDK_CLIENT_APP: 'cadence/1.0.0' };
  for (const key of Object.keys(env)) {
    if (/^(CLAUDECODE|CLAUDE_CODE_(?!OAUTH)|CLAUDE_PID|CLAUDE_EFFORT|AI_AGENT)/.test(key)) delete env[key];
  }
  return env;
}

function friendlyError(raw: string): string {
  if (/log ?in|auth|credential|401|not logged/i.test(raw)) {
    return 'Claude Code is not signed in on this computer. Run `claude` in a terminal, sign in, then try again.';
  }
  if (/rate.?limit|429|usage limit/i.test(raw)) return 'Your Claude plan hit its usage limit for now. Try again a little later.';
  return raw.length > 300 ? `${raw.slice(0, 300)}…` : raw;
}

/** Run one turn of the agent and stream it as AgentEvents. The snapshot is read-only by construction. */
export async function* runTurn(request: TurnRequest, signal: AbortSignal): AsyncGenerator<AgentEvent> {
  const queue = new EventQueue();
  const finished = new Set<string>();
  const started = new Map<string, ToolName>();
  const ctx: ToolContext = {
    snapshot: request.snapshot,
    newId: (prefix) => `${prefix}-${randomUUID().slice(0, 8)}`,
    now: () => new Date().toISOString(),
  };

  const handler =
    <K extends ToolName>(name: K) =>
    async (args: ToolInputs[K], extra: unknown) => {
      const outcome = runTool(name, args, ctx);
      const callId = toolUseIdFrom(extra);
      if (callId) {
        finished.add(callId);
        queue.push({ type: 'tool_finished', callId, tool: name, ok: outcome.ok, summary: outcome.summary });
      }
      if (outcome.proposal) queue.push({ type: 'proposal_created', proposal: outcome.proposal });
      return { content: [{ type: 'text' as const, text: outcome.forModel }], isError: !outcome.ok };
    };

  const server = createSdkMcpServer({
    name: SERVER_NAME,
    version: '1.0.0',
    tools: [
      tool('get_cycle_status', TOOL_DESCRIPTIONS.get_cycle_status, toolShapes.get_cycle_status, handler('get_cycle_status'), { annotations: { readOnlyHint: true } }),
      tool('list_events', TOOL_DESCRIPTIONS.list_events, toolShapes.list_events, handler('list_events'), { annotations: { readOnlyHint: true } }),
      tool('list_habits', TOOL_DESCRIPTIONS.list_habits, toolShapes.list_habits, handler('list_habits'), { annotations: { readOnlyHint: true } }),
      tool('get_check_ins', TOOL_DESCRIPTIONS.get_check_ins, toolShapes.get_check_ins, handler('get_check_ins'), { annotations: { readOnlyHint: true } }),
      tool('propose_changes', TOOL_DESCRIPTIONS.propose_changes, toolShapes.propose_changes, handler('propose_changes')),
      tool('log_check_in', TOOL_DESCRIPTIONS.log_check_in, toolShapes.log_check_in, handler('log_check_in')),
    ],
  });

  const abort = new AbortController();
  signal.addEventListener('abort', () => abort.abort(), { once: true });
  const startedAt = Date.now();

  const pump = async () => {
    try {
      const messages = query({
        prompt: buildTurnPrompt(request.snapshot.today, request.history, request.message),
        options: {
          model: request.model,
          systemPrompt: SYSTEM_PROMPT,
          tools: [],
          mcpServers: { [SERVER_NAME]: server },
          strictMcpConfig: true,
          allowedTools: TOOL_NAMES.map((n) => `${PREFIX}${n}`),
          permissionMode: 'dontAsk',
          settingSources: [],
          persistSession: false,
          includePartialMessages: true,
          thinking: { type: 'adaptive' },
          effort: 'medium',
          maxTurns: 12,
          abortController: abort,
          env: childEnv(),
          ...(process.env.CADENCE_CLAUDE_PATH ? { pathToClaudeCodeExecutable: process.env.CADENCE_CLAUDE_PATH } : {}),
        },
      });
      for await (const message of messages) handleMessage(message);
    } catch (err) {
      if (!abort.signal.aborted) queue.push({ type: 'error', message: friendlyError(err instanceof Error ? err.message : String(err)) });
    } finally {
      queue.close();
    }
  };

  let thinkingShown = false;
  const handleMessage = (message: SDKMessage) => {
    switch (message.type) {
      case 'stream_event': {
        if (message.parent_tool_use_id) return;
        const event = message.event;
        if (event.type === 'content_block_start') {
          const block = event.content_block;
          if (block.type === 'thinking' && !thinkingShown) {
            thinkingShown = true;
            queue.push({ type: 'thinking' });
          } else if (block.type === 'tool_use' && block.name.startsWith(PREFIX)) {
            const name = block.name.slice(PREFIX.length);
            if (isToolName(name)) {
              started.set(block.id, name);
              queue.push({ type: 'tool_started', callId: block.id, tool: name });
            }
          } else if (block.type === 'text') thinkingShown = false;
        } else if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          queue.push({ type: 'text_delta', text: event.delta.text });
        }
        return;
      }
      case 'user': {
        const content = message.message.content;
        if (!Array.isArray(content)) return;
        for (const block of content) {
          const tool = block.type === 'tool_result' ? started.get(block.tool_use_id) : undefined;
          if (block.type === 'tool_result' && tool && !finished.has(block.tool_use_id)) {
            finished.add(block.tool_use_id);
            queue.push({ type: 'tool_finished', callId: block.tool_use_id, tool, ok: false, summary: 'A step did not finish' });
          }
        }
        return;
      }
      case 'result': {
        if (message.subtype === 'success') {
          queue.push({ type: 'done', model: request.model, durationMs: Date.now() - startedAt });
        } else {
          const detail = 'errors' in message && Array.isArray(message.errors) ? message.errors.join('; ') : message.subtype;
          queue.push({ type: 'error', message: friendlyError(String(detail)) });
        }
        return;
      }
      default:
        return;
    }
  };

  void pump();
  yield* queue.drain();
}
