import { reduceAgentEvent, DEFAULT_MODEL, type AgentEvent, type AssistantMessage, type ChatMessage, type ModelId } from '../domain/agent.ts';
import { applyChange, type Change, type PlannerData } from '../domain/changes.ts';
import { approveAll, approveItem, declineAll, declineItem, undoItem, type Proposal, type ProposalOutcome } from '../domain/proposal.ts';
import type { ChangeId, ProposalId } from '../domain/types.ts';

export type ThemeChoice = 'system' | 'light' | 'dark';
export type Settings = { readonly model: ModelId; readonly theme: ThemeChoice };

export type Notice = { readonly id: number; readonly text: string; readonly tone: 'info' | 'error'; readonly undo?: Change };

export type AppState =
  | { readonly status: 'onboarding'; readonly settings: Settings }
  | {
      readonly status: 'ready';
      readonly settings: Settings;
      readonly data: PlannerData;
      readonly proposals: readonly Proposal[];
      readonly chat: readonly ChatMessage[];
      readonly notice: Notice | null;
    };

export type ReadyState = Extract<AppState, { status: 'ready' }>;

export type Action =
  | { type: 'start'; data: PlannerData }
  | { type: 'change'; change: Change; notice?: string }
  | { type: 'approve'; proposalId: ProposalId; itemId: ChangeId }
  | { type: 'decline'; proposalId: ProposalId; itemId: ChangeId }
  | { type: 'undo'; proposalId: ProposalId; itemId: ChangeId }
  | { type: 'approveAll'; proposalId: ProposalId }
  | { type: 'declineAll'; proposalId: ProposalId }
  | { type: 'userMessage'; id: string; text: string; replyId: string; source: AssistantMessage['source'] }
  | { type: 'agentEvent'; messageId: string; event: AgentEvent }
  | { type: 'clearChat' }
  | { type: 'settings'; patch: Partial<Settings> }
  | { type: 'dismissNotice' }
  | { type: 'reset' };

export const DEFAULT_SETTINGS: Settings = { model: DEFAULT_MODEL, theme: 'system' };

export const initialState = (settings: Settings = DEFAULT_SETTINGS): AppState => ({ status: 'onboarding', settings });

let noticeSeq = 0;
const notice = (text: string, tone: Notice['tone'] = 'info', undo?: Change): Notice => ({ id: ++noticeSeq, text, tone, ...(undo ? { undo } : {}) });

function withProposal(state: ReadyState, proposalId: ProposalId, run: (p: Proposal) => ProposalOutcome): ReadyState {
  const proposal = state.proposals.find((p) => p.id === proposalId);
  if (!proposal) return state;
  const outcome = run(proposal);
  return {
    ...state,
    data: outcome.ok ? outcome.data : state.data,
    proposals: state.proposals.map((p) => (p.id === proposalId ? outcome.proposal : p)),
    notice: outcome.ok ? state.notice : notice(outcome.error.message, 'error'),
  };
}

function uniqueProposal(state: ReadyState, proposal: Proposal): Proposal {
  if (!state.proposals.some((p) => p.id === proposal.id)) return proposal;
  const suffix = `-${state.proposals.length}`;
  return { ...proposal, id: `${proposal.id}${suffix}` as ProposalId };
}

function onAgentEvent(state: ReadyState, messageId: string, event: AgentEvent): ReadyState {
  let proposals = state.proposals;
  let routed = event;
  if (event.type === 'proposal_created') {
    const proposal = uniqueProposal(state, event.proposal);
    proposals = [...proposals, proposal];
    routed = { ...event, proposal };
  }
  return {
    ...state,
    proposals,
    chat: state.chat.map((m) => (m.role === 'assistant' && m.id === messageId ? reduceAgentEvent(m, routed) : m)),
  };
}

export function reducer(state: AppState, action: Action): AppState {
  if (action.type === 'settings') return { ...state, settings: { ...state.settings, ...action.patch } };
  if (action.type === 'reset') return initialState(state.settings);
  if (action.type === 'start') {
    return { status: 'ready', settings: state.settings, data: action.data, proposals: [], chat: [], notice: null };
  }
  if (state.status !== 'ready') return state;

  switch (action.type) {
    case 'change': {
      const result = applyChange(state.data, action.change);
      if (!result.ok) return { ...state, notice: notice(result.error.message, 'error') };
      return { ...state, data: result.data, notice: action.notice ? notice(action.notice, 'info', result.inverse) : state.notice };
    }
    case 'approve':
      return withProposal(state, action.proposalId, (p) => approveItem(state.data, p, action.itemId));
    case 'decline':
      return withProposal(state, action.proposalId, (p) => declineItem(state.data, p, action.itemId));
    case 'undo':
      return withProposal(state, action.proposalId, (p) => undoItem(state.data, p, action.itemId));
    case 'approveAll':
      return withProposal(state, action.proposalId, (p) => ({ ok: true, ...approveAll(state.data, p) }));
    case 'declineAll':
      return withProposal(state, action.proposalId, (p) => ({ ok: true, data: state.data, proposal: declineAll(p) }));
    case 'userMessage': {
      const reply: AssistantMessage = { role: 'assistant', id: action.replyId, parts: [], status: 'thinking', source: action.source };
      return { ...state, chat: [...state.chat, { role: 'user', id: action.id, text: action.text }, reply] };
    }
    case 'agentEvent':
      return onAgentEvent(state, action.messageId, action.event);
    case 'clearChat':
      return { ...state, chat: [] };
    case 'dismissNotice':
      return { ...state, notice: null };
  }
}
