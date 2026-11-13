import type { PriorTurn } from '../domain/agent.ts';
import { dayName, formatShortDate, type ISODate } from '../domain/time.ts';

/**
 * The user message for one turn. The session is stateless, so the thread so far rides along as text.
 * The system prompt stays fixed, which keeps it cacheable across turns.
 */
export function buildTurnPrompt(today: ISODate, history: readonly PriorTurn[], message: string): string {
  const parts = [`Today is ${dayName(today)}, ${formatShortDate(today)}, ${today.slice(0, 4)} (${today}).`];
  if (history.length) {
    const lines = history.map((t) => `${t.role === 'user' ? 'User' : 'Cadence'}: ${t.text}`);
    parts.push(`<conversation_so_far>\n${lines.join('\n\n')}\n</conversation_so_far>`);
  }
  parts.push(`<message>\n${message}\n</message>`);
  return parts.join('\n\n');
}
