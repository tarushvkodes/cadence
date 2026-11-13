import { createContext, useContext } from 'react';

/**
 * voiced: the recorded narration, captions, music under it, interface sounds.
 * music: no voice and no captions, for narrating live; music and interface sounds.
 * silent: picture only.
 */
export type Variant = 'voiced' | 'music' | 'silent';
export type Mix = { voice: boolean; music: boolean; sfx: boolean; captions: boolean };

export const MIXES: Record<Variant, Mix> = {
  voiced: { voice: true, music: true, sfx: true, captions: true },
  music: { voice: false, music: true, sfx: true, captions: false },
  silent: { voice: false, music: false, sfx: false, captions: false },
};

export const MixContext = createContext<Mix>(MIXES.silent);
export const useMix = () => useContext(MixContext);
