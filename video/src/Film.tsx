import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile } from 'remotion';
import '../../src/styles/base.css';
import '../../src/styles/glass.css';
import { paletteCss } from '../../src/ui/palette.ts';
import { Captions } from './kit/Captions.tsx';
import { MIXES, MixContext, type Variant } from './kit/mix.ts';
import { C } from './kit/theme.ts';
import { Decide } from './scenes/Decide.tsx';
import { End } from './scenes/End.tsx';
import { Guide } from './scenes/Guide.tsx';
import { Idea } from './scenes/Idea.tsx';
import { Inside } from './scenes/Inside.tsx';
import { Rough } from './scenes/Rough.tsx';
import { Safety } from './scenes/Safety.tsx';
import { Setup } from './scenes/Setup.tsx';
import { Title } from './scenes/Title.tsx';
import { Today } from './scenes/Today.tsx';
import { FPS, TIMELINE, TOTAL_FRAMES } from './timeline.ts';

/**
 * The voice track alone (`npm run render:voice`) measured -16.8 LUFS at unity, so the voice and the
 * music under it both rise 0.8 dB to put the narration at -16 LUFS integrated.
 */
const VOICE_GAIN = 1.1;
const MASTER = 1.1;

export type FilmProps = { variant: Variant };

const SCENES: Record<string, React.FC> = {
  title: Title,
  idea: Idea,
  setup: Setup,
  today: Today,
  guide: Guide,
  decide: Decide,
  rough: Rough,
  safety: Safety,
  inside: Inside,
  end: End,
};

if (typeof document !== 'undefined') document.documentElement.dataset.theme = 'light';

/** Each verified line of the narration, played from its own take at the film's timing. */
const Voice: React.FC = () => (
  <>
    {TIMELINE.lines.map((l) => (
      <Sequence key={l.id} from={l.from} durationInFrames={Math.ceil(l.length * FPS) + 2} layout="none">
        <Audio src={staticFile(l.file)} volume={VOICE_GAIN} />
      </Sequence>
    ))}
  </>
);

/**
 * The music bed. Under the recorded voice it dips while each line is spoken and lifts in the gaps;
 * without a voice it sits at one steady level for a live narrator.
 */
const Bed: React.FC<{ ducked: boolean }> = ({ ducked }) => {
  const base = ducked ? 0.34 : 0.3;
  const under = 0.15;
  const level = (f: number) => {
    const fadeIn = Math.min(1, (f + 2) / 4);
    const fadeOut = Math.min(1, (TOTAL_FRAMES - f) / 60);
    if (!ducked) return MASTER * base * fadeIn * fadeOut;
    let duck = 0;
    for (const l of TIMELINE.lines) {
      const into = (f - (l.from - 8)) / 8;
      const out = (l.end + 14 - f) / 14;
      duck = Math.max(duck, Math.min(1, Math.max(0, Math.min(into, out))));
    }
    return MASTER * (base - (base - under) * duck) * fadeIn * fadeOut;
  };
  return <Audio src={staticFile('audio/bed.wav')} volume={level} />;
};

export const Film: React.FC<FilmProps> = ({ variant }) => {
  const mix = MIXES[variant];
  return (
    <MixContext.Provider value={mix}>
      <AbsoluteFill style={{ background: C.bg }}>
        <style>{paletteCss()}</style>
        {TIMELINE.chapters.map((c) => {
          const Scene = SCENES[c.id] as React.FC;
          return (
            <Sequence key={c.id} from={c.from} durationInFrames={c.end - c.from} name={c.name}>
              <Scene />
            </Sequence>
          );
        })}
        {mix.captions ? <Captions /> : null}
        {mix.voice ? <Voice /> : null}
        {mix.music ? <Bed ducked={mix.voice} /> : null}
      </AbsoluteFill>
    </MixContext.Provider>
  );
};
