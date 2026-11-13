import type { Proposal } from './proposal.ts';
import type { ISODate } from './time.ts';
import type { CalendarEvent, CheckIn, CycleProfile, Habit } from './types.ts';

export const TOOL_NAMES = ['get_cycle_status', 'list_events', 'list_habits', 'get_check_ins', 'propose_changes', 'log_check_in'] as const;
export type ToolName = (typeof TOOL_NAMES)[number];

export function isToolName(value: string): value is ToolName {
  return (TOOL_NAMES as readonly string[]).includes(value);
}

/** How each tool reads in the conversation while it runs, and whether it can only read. */
export const TOOL_META: Record<ToolName, { running: string; kind: 'read' | 'propose'; plain: string }> = {
  get_cycle_status: { running: 'Checking your cycle estimate', kind: 'read', plain: 'Where you probably are in your cycle, with the confidence and ranges' },
  list_events: { running: 'Reading your calendar', kind: 'read', plain: 'Your events for a date range' },
  list_habits: { running: 'Reading your habits', kind: 'read', plain: 'Your habits and their phase versions' },
  get_check_ins: { running: 'Reading your check-ins', kind: 'read', plain: 'Your recent energy, mood, and symptom logs' },
  propose_changes: { running: 'Drafting suggestions', kind: 'propose', plain: 'Suggest calendar or habit changes for you to approve' },
  log_check_in: { running: 'Drafting a check-in', kind: 'propose', plain: 'Suggest a check-in entry for you to approve' },
};

export const MODELS = [
  { id: 'claude-opus-5-5', label: 'Claude Opus 5.5', note: 'Most thoughtful. The default.' },
  { id: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5', note: 'Faster replies.' },
] as const;
export type ModelId = (typeof MODELS)[number]['id'];
export const DEFAULT_MODEL: ModelId = 'claude-opus-5-5';

export function isModelId(value: string): value is ModelId {
  return MODELS.some((m) => m.id === value);
}

/**
 * One step of an agent session. A live session and a replayed fixture emit exactly this type, and the
 * UI renders both through `reduceAgentEvent`.
 */
export type AgentEvent =
  | { readonly type: 'thinking' }
  | { readonly type: 'text_delta'; readonly text: string }
  | { readonly type: 'tool_started'; readonly callId: string; readonly tool: ToolName }
  | { readonly type: 'tool_finished'; readonly callId: string; readonly tool: ToolName; readonly ok: boolean; readonly summary: string }
  | { readonly type: 'proposal_created'; readonly proposal: Proposal }
  | { readonly type: 'done'; readonly model: string; readonly durationMs: number }
  | { readonly type: 'error'; readonly message: string };

/** An event stamped with milliseconds since the turn started. */
export type TimedEvent = { readonly t: number; readonly event: AgentEvent };

/** The slice of the user's data a session may read. Sent with every turn; the bridge stores nothing. */
export type AgentSnapshot = {
  readonly today: ISODate;
  readonly profile: CycleProfile;
  readonly events: readonly CalendarEvent[];
  readonly habits: readonly Habit[];
  readonly checkIns: readonly CheckIn[];
};

/** Earlier turns, flattened to what the model needs to keep the thread. */
export type PriorTurn = { readonly role: 'user' | 'assistant'; readonly text: string };

export type TurnRequest = {
  readonly model: ModelId;
  readonly message: string;
  readonly history: readonly PriorTurn[];
  readonly snapshot: AgentSnapshot;
  readonly record?: { readonly flow: string; readonly turnIndex: number };
};

export type FixtureTurn = { readonly message: string; readonly events: readonly TimedEvent[] };

export type Fixture = {
  readonly version: 1;
  readonly flow: string;
  readonly model: string;
  readonly recordedAt: string;
  readonly today: ISODate;
  readonly turns: readonly FixtureTurn[];
};

export type AssistantPart =
  | { readonly type: 'text'; readonly text: string }
  | { readonly type: 'tool'; readonly callId: string; readonly tool: ToolName; readonly status: 'running' | 'done' | 'error'; readonly summary?: string }
  | { readonly type: 'proposal'; readonly proposalId: Proposal['id'] };

export type AssistantMessage = {
  readonly role: 'assistant';
  readonly id: string;
  readonly parts: readonly AssistantPart[];
  readonly status: 'thinking' | 'streaming' | 'done' | 'error';
  readonly source: 'live' | 'replay';
  readonly model?: string;
  readonly error?: string;
};

export type UserMessage = { readonly role: 'user'; readonly id: string; readonly text: string };
export type ChatMessage = UserMessage | AssistantMessage;

/** Fold one event into the assistant message it belongs to. Proposals themselves live in app state. */
export function reduceAgentEvent(message: AssistantMessage, event: AgentEvent): AssistantMessage {
  switch (event.type) {
    case 'thinking':
      return message.status === 'thinking' ? message : { ...message, status: 'thinking' };
    case 'text_delta': {
      const last = message.parts.at(-1);
      const parts =
        last?.type === 'text'
          ? [...message.parts.slice(0, -1), { type: 'text' as const, text: last.text + event.text }]
          : [...message.parts, { type: 'text' as const, text: event.text }];
      return { ...message, parts, status: 'streaming' };
    }
    case 'tool_started':
      return {
        ...message,
        status: 'streaming',
        parts: [...message.parts, { type: 'tool', callId: event.callId, tool: event.tool, status: 'running' }],
      };
    case 'tool_finished':
      return {
        ...message,
        parts: message.parts.map((p) =>
          p.type === 'tool' && p.callId === event.callId ? { ...p, status: event.ok ? 'done' : 'error', summary: event.summary } : p,
        ),
      };
    case 'proposal_created':
      return { ...message, parts: [...message.parts, { type: 'proposal', proposalId: event.proposal.id }] };
    case 'done':
      return { ...message, status: 'done', model: event.model };
    case 'error':
      return { ...message, status: 'error', error: event.message };
  }
}

/** Text the model said in a message, for carrying the thread into the next turn. */
export function assistantText(message: AssistantMessage): string {
  return message.parts
    .flatMap((p) => (p.type === 'text' ? [p.text] : p.type === 'proposal' ? ['[I sent suggestions for the user to review.]'] : []))
    .join('\n')
    .trim();
}
