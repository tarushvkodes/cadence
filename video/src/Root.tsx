import React from 'react';
import { Composition } from 'remotion';
import { Film, type FilmProps } from './Film.tsx';
import { FPS, TOTAL_FRAMES } from './timeline.ts';

export const Root: React.FC = () => (
  <Composition
    id="CadenceDemo"
    component={Film}
    width={1920}
    height={1080}
    fps={FPS}
    durationInFrames={TOTAL_FRAMES}
    defaultProps={{ variant: 'voiced' } satisfies FilmProps}
  />
);
