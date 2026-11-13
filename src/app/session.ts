import { isModelId } from '../domain/agent.ts';
import { demoSeed, isDemoFlow, type DemoFlow, type DemoSeed } from '../domain/sample.ts';
import { todayLocal, type ISODate } from '../domain/time.ts';
import { DEFAULT_SETTINGS, initialState, type AppState, type ThemeChoice } from './store.ts';

/**
 * How this page load runs. `?demo=<flow>` seeds fixed data on a fixed day and arms the recorded
 * replay; `&live=1` sends the same seeded turns to the real bridge; `&record=1` also saves them.
 */
export type Session = {
  readonly today: ISODate;
  readonly storageKey: string;
  readonly demo: null | {
    readonly seed: DemoSeed;
    readonly agent: 'replay' | 'live';
    readonly record: boolean;
    readonly speed: number;
    /** Longest pause a replay may hold, from `&gap=<seconds>`. Null keeps the original pauses. */
    readonly maxGapMs: number | null;
    readonly keep: boolean;
  };
  readonly themeOverride: ThemeChoice | null;
};

const STORAGE_KEY = 'cadence.v1';

export function readSession(search: string = window.location.search): Session {
  const params = new URLSearchParams(search);
  const flow = params.get('demo');
  const theme = params.get('theme');
  const themeOverride = theme === 'light' || theme === 'dark' ? theme : null;
  if (!isDemoFlow(flow)) return { today: todayLocal(), storageKey: STORAGE_KEY, demo: null, themeOverride };
  const seed = demoSeed(flow);
  const speed = Number(params.get('speed') ?? '1');
  const gap = Number(params.get('gap'));
  return {
    today: seed.today,
    storageKey: `cadence.demo.${flow}.v1`,
    themeOverride,
    demo: {
      seed,
      agent: params.get('live') === '1' ? 'live' : 'replay',
      record: params.get('record') === '1',
      speed: Number.isFinite(speed) && speed > 0 ? speed : 1,
      maxGapMs: params.has('gap') && Number.isFinite(gap) && gap > 0 ? gap * 1000 : null,
      keep: params.get('keep') === '1',
    },
  };
}

export function demoInitialState(seed: DemoSeed): AppState {
  return { status: 'ready', settings: DEFAULT_SETTINGS, data: seed.data, proposals: [], chat: [], notice: null };
}

/** Local storage is a boundary: anything unreadable falls back to a fresh start. */
export function loadState(session: Session): AppState {
  if (session.demo && !session.demo.keep) return demoInitialState(session.demo.seed);
  try {
    const raw = window.localStorage.getItem(session.storageKey);
    if (!raw) return session.demo ? demoInitialState(session.demo.seed) : initialState();
    const parsed = JSON.parse(raw) as { version?: number; state?: AppState };
    if (parsed.version !== 1 || !parsed.state || (parsed.state.status !== 'ready' && parsed.state.status !== 'onboarding')) {
      return initialState();
    }
    const state = parsed.state;
    const settings = { ...DEFAULT_SETTINGS, ...state.settings };
    if (!isModelId(settings.model)) settings.model = DEFAULT_SETTINGS.model;
    if (state.status === 'onboarding') return { status: 'onboarding', settings };
    return {
      ...state,
      settings,
      notice: null,
      chat: state.chat.map((m) =>
        m.role === 'assistant' && (m.status === 'thinking' || m.status === 'streaming') ? { ...m, status: 'error', error: 'This reply was interrupted.' } : m,
      ),
    };
  } catch {
    return session.demo ? demoInitialState(session.demo.seed) : initialState();
  }
}

export function saveState(session: Session, state: AppState) {
  try {
    const toSave = state.status === 'ready' ? { ...state, notice: null } : state;
    window.localStorage.setItem(session.storageKey, JSON.stringify({ version: 1, state: toSave }));
  } catch {
    /* Storage can be full or blocked; the app keeps working in memory. */
  }
}

export function clearStorage(session: Session) {
  try {
    window.localStorage.removeItem(session.storageKey);
  } catch {
    /* nothing to clear */
  }
}

export type { DemoFlow };
