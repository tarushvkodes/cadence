import { BookOpenText, Briefcase, Dumbbell, Flag, GraduationCap, HeartPulse, Home, PenLine, Users, UtensilsCrossed, type LucideIcon } from 'lucide-react';
import type { EventKind, Load } from '../domain/types.ts';

export const KIND_ICON: Record<EventKind, LucideIcon> = {
  class: GraduationCap,
  exam: PenLine,
  deadline: Flag,
  study: BookOpenText,
  work: Briefcase,
  exercise: Dumbbell,
  club: Users,
  social: UtensilsCrossed,
  personal: Home,
  health: HeartPulse,
};

export const LOAD_LABEL: Record<Load, string> = { light: 'Light', moderate: 'Moderate', demanding: 'Demanding' };
const LOAD_LEVEL: Record<Load, number> = { light: 1, moderate: 2, demanding: 3 };

export function LoadMeter({ load }: { load: Load }) {
  const level = LOAD_LEVEL[load];
  return (
    <span className="load-meter" title={`${LOAD_LABEL[load]} load`}>
      {[1, 2, 3].map((i) => (
        <span key={i} className={i <= level ? 'on' : undefined} />
      ))}
      <span className="visually-hidden">{LOAD_LABEL[load]} load</span>
    </span>
  );
}
