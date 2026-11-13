import type { Phase } from '../domain/types.ts';

/**
 * Every source Cadence cites, from the team's verified source list. A source without a `url` was named
 * in that list without an opened link, so it is cited by name only and never linked.
 */
export type Source = {
  readonly cite: string;
  readonly title?: string;
  readonly venue: string;
  readonly url?: string;
};

export const SOURCES = {
  jang2025: {
    cite: 'Jang et al. 2025',
    title: 'Menstrual cycle effects on cognitive performance: A meta-analysis',
    venue: 'PLOS ONE',
    url: 'https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0318576',
  },
  ronca2024: {
    cite: 'Ronca et al. 2024',
    venue: 'Neuropsychologia 206: 108909',
  },
  colenso2023: {
    cite: 'Colenso-Semple et al. 2023',
    title: "Current evidence shows no influence of women's menstrual cycle phase on acute strength performance or adaptations to resistance exercise training",
    venue: 'Frontiers in Sports and Active Living',
    url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10076834/',
  },
  mcnulty2020: {
    cite: 'McNulty et al. 2020',
    title: 'The Effects of Menstrual Cycle Phase on Exercise Performance in Eumenorrheic Women',
    venue: 'Sports Medicine',
    url: 'https://link.springer.com/article/10.1007/s40279-020-01319-3',
  },
  liguori2023: {
    cite: 'Liguori et al. 2023',
    title: "Premenstrual Syndrome and Premenstrual Dysphoric Disorder's Impact on Quality of Life, and the Role of Physical Activity",
    venue: 'Medicina',
    url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10673441/',
  },
  bull2019: {
    cite: 'Bull et al. 2019',
    title: 'Real-world menstrual cycle characteristics of more than 600,000 menstrual cycles',
    venue: 'npj Digital Medicine',
    url: 'https://www.nature.com/articles/s41746-019-0152-7',
  },
  worsfold2021: {
    cite: 'Worsfold et al. 2021',
    title: 'Period tracker applications: What menstrual cycle information are they giving women?',
    venue: "Women's Health",
    url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8504278/',
  },
  johnson2018: {
    cite: 'Johnson et al. 2018',
    venue: 'Current Medical Research and Opinion 34(9): 1587-1594',
  },
  acog2015: {
    cite: 'ACOG 2015, reaffirmed 2021',
    title: 'Menstruation in Girls and Adolescents: Using the Menstrual Cycle as a Vital Sign',
    venue: 'American College of Obstetricians and Gynecologists',
    url: 'https://www.acog.org/clinical/clinical-guidance/committee-opinion/articles/2015/12/menstruation-in-girls-and-adolescents-using-the-menstrual-cycle-as-a-vital-sign',
  },
  ftcFlo2021: {
    cite: 'TechCrunch 2021, on the FTC and Flo Health',
    title: 'Flo gets FTC slap for sharing user data when it promised privacy',
    venue: 'TechCrunch',
    url: 'https://techcrunch.com/2021/01/13/flo-gets-ftc-slap-for-sharing-user-data-when-it-promised-privacy/',
  },
  anthropicToolUse: {
    cite: 'Anthropic docs',
    title: 'Tool use with Claude',
    venue: 'Anthropic documentation',
    url: 'https://docs.anthropic.com/en/docs/agents-and-tools/tool-use/overview',
  },
  anthropicLoop: {
    cite: 'Anthropic docs',
    title: 'How tool use works',
    venue: 'Anthropic documentation',
    url: 'https://docs.anthropic.com/en/docs/agents-and-tools/tool-use/how-tool-use-works',
  },
  agentSdk: {
    cite: 'Anthropic',
    title: 'Claude Agent SDK',
    venue: 'GitHub',
    url: 'https://github.com/anthropics/claude-agent-sdk-python',
  },
} as const satisfies Record<string, Source>;

export type SourceId = keyof typeof SOURCES;

export type EvidenceLevel = 'well-supported' | 'mixed' | 'weak';

export const EVIDENCE_LABELS: Record<EvidenceLevel, { label: string; meaning: string }> = {
  'well-supported': { label: 'Well supported', meaning: 'Large reviews or clinical guidance agree.' },
  mixed: { label: 'Mixed', meaning: 'Some studies find it, others do not, and people differ a lot.' },
  weak: { label: 'Weak', meaning: 'Little good evidence, or the evidence points the other way.' },
};

export type Claim = {
  readonly text: string;
  readonly level: EvidenceLevel;
  readonly sources: readonly SourceId[];
  readonly detail?: string;
};

export type PhaseGuide = {
  readonly phase: Phase;
  readonly when: string;
  /** What defines the phase. Definitional, so it carries no evidence label. */
  readonly whatHappens: string;
  /** Hedged things a person might notice, shown on Today. */
  readonly mightNotice: readonly string[];
  readonly claims: readonly Claim[];
};

export const STANCE = {
  headline: 'Your phase does not change what you are capable of.',
  body: 'How you feel can change, and that differs from person to person. Cadence plans around what you log about yourself, and treats your phase as a hint, not a rule.',
};

export const PHASE_GUIDES: readonly PhaseGuide[] = [
  {
    phase: 'menstrual',
    when: 'Your period, usually the first 2 to 7 days',
    whatHappens: 'The lining of the uterus sheds. This is day 1 of a new cycle, and hormone levels are at their lowest point.',
    mightNotice: ['Cramps, lower back pain, or tiredness, often worst on the first day or two', 'Wanting more rest or warmth', 'Some people feel fine, and that is normal too'],
    claims: [
      {
        text: 'Thinking, memory, and focus do not measurably change during your period, or in any phase.',
        level: 'well-supported',
        sources: ['jang2025'],
        detail: 'A meta-analysis of 102 studies and 3,943 people found no robust shifts in speed or accuracy across the cycle.',
      },
      {
        text: 'Many people feel worst during their period, even while their measured performance holds steady.',
        level: 'well-supported',
        sources: ['ronca2024', 'jang2025'],
        detail: 'Feeling rough is real and worth planning around. It is not the same as being less able.',
      },
      {
        text: 'Exercise performance might be very slightly lower early in your period.',
        level: 'weak',
        sources: ['mcnulty2020'],
        detail: 'The effect was trivial and the evidence quality was rated low. The authors recommend going by how your own body responds.',
      },
    ],
  },
  {
    phase: 'follicular',
    when: 'After your period, until ovulation',
    whatHappens: 'A follicle in the ovary matures and estrogen rises. This is the part of the cycle whose length varies most.',
    mightNotice: ['Energy often comes back after your period', 'Some people feel more social or restless', 'Your check-ins will show what is true for you'],
    claims: [
      {
        text: 'Cycle length varies mostly through this phase. Only about 13% of cycles are exactly 28 days.',
        level: 'well-supported',
        sources: ['bull2019'],
      },
      {
        text: 'Scheduling your hardest training here because of your phase gives better results.',
        level: 'weak',
        sources: ['colenso2023'],
        detail: 'Reviews find no reliable effect of phase on strength or training gains. Plan training around recovery and how you feel.',
      },
    ],
  },
  {
    phase: 'ovulatory',
    when: 'Around the middle, roughly 12 to 14 days before your next period',
    whatHappens: 'An egg is released. Estrogen peaks just before, and progesterone starts to rise after.',
    mightNotice: ['A brief twinge on one side for some people', 'Changes in discharge', 'Many people notice nothing at all'],
    claims: [
      {
        text: 'Apps that only count calendar days rarely get ovulation day right.',
        level: 'well-supported',
        sources: ['worsfold2021', 'johnson2018'],
        detail: 'Calendar-only predictions hit the exact day 8 to 21% of the time. Cadence shows a window, and it is never for birth control or for planning a pregnancy.',
      },
      {
        text: 'You think or decide better around ovulation.',
        level: 'weak',
        sources: ['jang2025'],
        detail: 'No phase measurably changes cognitive performance.',
      },
    ],
  },
  {
    phase: 'luteal',
    when: 'After ovulation, until your next period',
    whatHappens: 'Progesterone rises, then estrogen and progesterone both fall in the days before your period.',
    mightNotice: ['Bloating, tender breasts, cravings, or poorer sleep in the last few days', 'Mood shifts for some people', 'Plenty of people notice very little'],
    claims: [
      {
        text: 'Up to about 75% of people report at least one premenstrual symptom.',
        level: 'well-supported',
        sources: ['liguori2023'],
      },
      {
        text: 'Daily check-ins describe your pattern better than memory does.',
        level: 'well-supported',
        sources: ['liguori2023'],
        detail: 'People tend to overestimate how cyclical their symptoms are when they look back. Logging as you go gives a truer picture.',
      },
      {
        text: 'Your focus or judgment drops before your period.',
        level: 'weak',
        sources: ['jang2025'],
        detail: 'Large reviews find no measurable change in cognitive performance across the cycle.',
      },
      {
        text: 'Severe mood symptoms before periods (PMDD) are uncommon and worth seeing a clinician about.',
        level: 'well-supported',
        sources: ['liguori2023'],
        detail: 'PMDD affects roughly 3 to 8% of people in surveys, and fewer when tracked day by day. If mood changes feel out of control, a clinician can help.',
      },
    ],
  },
];

export const CYCLE_FACTS: readonly Claim[] = [
  {
    text: 'In the first few years after a first period, cycles anywhere from 21 to 45 days are common.',
    level: 'well-supported',
    sources: ['acog2015'],
    detail: 'Doctors treat the menstrual cycle as a vital sign: a change in it is worth mentioning at a checkup.',
  },
  { text: 'Only about 13% of cycles are exactly 28 days long.', level: 'well-supported', sources: ['bull2019'] },
  {
    text: 'Calendar-only predictions get the exact day of ovulation right 8 to 21% of the time.',
    level: 'well-supported',
    sources: ['worsfold2021', 'johnson2018'],
  },
];

export function phaseGuide(phase: Phase): PhaseGuide {
  return PHASE_GUIDES.find((g) => g.phase === phase) as PhaseGuide;
}
