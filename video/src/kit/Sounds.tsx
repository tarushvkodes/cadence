import React from 'react';
import { Audio, Sequence, staticFile } from 'remotion';
import { useMix } from './mix.ts';
import { clicks, type TakeId } from './takes.ts';

export type SfxName = 'tap' | 'tick' | 'chime' | 'whoosh';

/** Interface sounds sit under the voice; these include the film's 1.6 dB master lift. */
const LEVEL: Record<SfxName, number> = { tap: 0.38, tick: 0.26, chime: 0.36, whoosh: 0.19 };

/** One interface sound at a frame of the current sequence. */
export const Sfx: React.FC<{ at: number; name: SfxName; gain?: number }> = ({ at, name, gain = 1 }) => {
  const mix = useMix();
  if (!mix.sfx || at < 0) return null;
  return (
    <Sequence from={Math.round(at)} durationInFrames={90} layout="none">
      <Audio src={staticFile(`audio/${name}.wav`)} volume={LEVEL[name] * gain} />
    </Sequence>
  );
};

/** A soft tap on every click of a take, at the film frame where the shot's time map reaches it. */
export const ClickSounds: React.FC<{ take: TakeId; time: (f: number) => number; length: number }> = ({ take, time, length }) => {
  const at: number[] = [];
  for (const c of clicks(take)) {
    for (let f = 1; f < length; f++) {
      if (time(f - 1) < c.frame && time(f) >= c.frame) {
        at.push(f);
        break;
      }
    }
  }
  return (
    <>
      {at.map((f) => (
        <Sfx key={f} at={f} name="tap" />
      ))}
    </>
  );
};
