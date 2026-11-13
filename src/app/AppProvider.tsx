import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type Dispatch, type ReactNode } from 'react';
import type { Fixture, TimedEvent } from '../domain/agent.ts';
import { estimatePhase, type PhaseEstimate } from '../domain/cycle.ts';
import type { ISODate } from '../domain/time.ts';
import { buildHistory, buildSnapshot, checkBridge, liveTurn, loadFixture, replayTurn } from './agentClient.ts';
import { loadState, saveState, type Session } from './session.ts';
import { reducer, type Action, type AppState, type ReadyState } from './store.ts';

export type BridgeStatus = 'checking' | 'online' | 'offline';

export type AgentControls = {
  readonly busy: boolean;
  /** Where the next reply comes from: the real bridge, or a recorded session. */
  readonly mode: 'live' | 'replay';
  readonly canSend: boolean;
  /** In a demo, the prompt the recording expects next. */
  readonly nextPrompt: string | null;
  send(text: string): void;
  stop(): void;
};

type AppContextValue = {
  readonly state: AppState;
  readonly dispatch: Dispatch<Action>;
  readonly session: Session;
  readonly today: ISODate;
  readonly estimate: PhaseEstimate | null;
  readonly bridge: BridgeStatus;
  readonly agent: AgentControls;
};

const AppContext = createContext<AppContextValue | null>(null);

let idSeq = 0;
const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(++idSeq).toString(36)}`;

function useBridgeStatus(): BridgeStatus {
  const [status, setStatus] = useState<BridgeStatus>('checking');
  useEffect(() => {
    const abort = new AbortController();
    const poll = async () => {
      const ok = await checkBridge(abort.signal);
      if (!abort.signal.aborted) setStatus(ok ? 'online' : 'offline');
    };
    void poll();
    const timer = window.setInterval(poll, 8000);
    return () => (abort.abort(), window.clearInterval(timer));
  }, []);
  return status;
}

function useFixture(session: Session): Fixture | null | undefined {
  const [fixture, setFixture] = useState<Fixture | null | undefined>(undefined);
  const flow = session.demo?.agent === 'replay' ? session.demo.seed.flow : null;
  useEffect(() => {
    if (!flow) return;
    let live = true;
    loadFixture(flow).then((f) => live && setFixture(f));
    return () => {
      live = false;
    };
  }, [flow]);
  return flow ? fixture : null;
}

export function AppProvider({ session, children }: { session: Session; children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, session, loadState);
  const bridge = useBridgeStatus();
  const fixture = useFixture(session);
  const running = useRef<AbortController | null>(null);
  const [busy, setBusy] = useState(false);
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => saveState(session, state), [session, state]);

  const theme = session.themeOverride ?? state.settings.theme;
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') delete root.dataset.theme;
    else root.dataset.theme = theme;
  }, [theme]);

  const estimate = useMemo(
    () => (state.status === 'ready' ? estimatePhase(state.data.profile, session.today) : null),
    [state, session.today],
  );
  useEffect(() => {
    const root = document.documentElement;
    if (estimate?.kind === 'estimate') root.dataset.phase = estimate.phase;
    else delete root.dataset.phase;
  }, [estimate]);

  const mode: AgentControls['mode'] = session.demo?.agent === 'replay' ? 'replay' : 'live';
  const userTurns = state.status === 'ready' ? state.chat.filter((m) => m.role === 'user').length : 0;
  const nextPrompt = session.demo ? (fixture?.turns[userTurns]?.message ?? session.demo.seed.prompts[userTurns] ?? null) : null;

  const send = useCallback(
    (text: string) => {
      const current = stateRef.current;
      if (current.status !== 'ready' || running.current) return;
      const trimmed = text.trim();
      if (!trimmed) return;
      const replyId = newId('a');
      const turnIndex = current.chat.filter((m) => m.role === 'user').length;
      dispatch({ type: 'userMessage', id: newId('u'), text: trimmed, replyId, source: mode });

      const abort = new AbortController();
      running.current = abort;
      setBusy(true);

      const events = (): AsyncGenerator<TimedEvent> | TimedEvent[] => {
        if (mode === 'replay') {
          const turn = fixture?.turns[turnIndex];
          if (!turn) {
            return [{ t: 0, event: { type: 'error', message: 'This demo has no more recorded replies. Reload the page to start it over.' } }];
          }
          return replayTurn(turn, { speed: session.demo?.speed ?? 1, maxGapMs: session.demo?.maxGapMs ?? null }, abort.signal);
        }
        const ready = current as ReadyState;
        return liveTurn(
          {
            model: ready.settings.model,
            message: trimmed,
            history: buildHistory(ready.chat),
            snapshot: buildSnapshot(ready.data, session.today),
            ...(session.demo?.record ? { record: { flow: session.demo.seed.flow, turnIndex } } : {}),
          },
          abort.signal,
        );
      };

      void (async () => {
        let ended = false;
        try {
          for await (const { event } of events()) {
            dispatch({ type: 'agentEvent', messageId: replyId, event });
            if (event.type === 'done' || event.type === 'error') ended = true;
          }
          if (!ended) {
            const message = abort.signal.aborted ? 'Stopped.' : 'The reply ended early.';
            dispatch({ type: 'agentEvent', messageId: replyId, event: { type: 'error', message } });
          }
        } finally {
          running.current = null;
          setBusy(false);
        }
      })();
    },
    [fixture, mode, session],
  );

  const stop = useCallback(() => running.current?.abort(), []);
  useEffect(() => () => running.current?.abort(), []);

  const canSend = !busy && (mode === 'replay' ? Boolean(fixture) : bridge === 'online');
  const agent = useMemo<AgentControls>(() => ({ busy, mode, canSend, nextPrompt, send, stop }), [busy, mode, canSend, nextPrompt, send, stop]);

  const value = useMemo<AppContextValue>(
    () => ({ state, dispatch, session, today: session.today, estimate, bridge, agent }),
    [state, session, estimate, bridge, agent],
  );
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp outside AppProvider');
  return ctx;
}

/** For screens that only render once onboarding is done. */
export function useReady(): AppContextValue & { state: ReadyState } {
  const ctx = useApp();
  if (ctx.state.status !== 'ready') throw new Error('useReady before onboarding finished');
  return ctx as AppContextValue & { state: ReadyState };
}
