import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { Sfx } from '../kit/Sounds.tsx';
import { C, CLAMP, ease, FONT, PHASE, rise, tween } from '../kit/theme.ts';
import { chapter, line, word } from '../timeline.ts';

const LEFT = 220;
const EYEBROW: React.CSSProperties = { font: `600 26px/1 ${FONT.sans}`, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.ink2 };

/** Enters with a spring from below; `dim` fades it back once the argument moves on. */
const enter = (show: number, dim = 0, dy = 26): React.CSSProperties => ({
  opacity: show * interpolate(dim, [0, 1], [1, 0.42]),
  transform: `translateY(${(1 - show) * dy}px)`,
});

/**
 * The idea, as an argument the viewer watches change: the assumption we started with, struck out by
 * the research, the finding with its source, and what Cadence does instead. The assumption is framed
 * as an assumption from its first frame and is retired while it is still being spoken about.
 */
export const Idea: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = chapter('idea');
  const len = c.end - c.from;
  const i1 = line('idea.1');
  const i3 = line('idea.3');
  const i4 = line('idea.4');
  const i5 = line('idea.5');

  const assumed = rise(frame, i1.local - 6, fps);
  const strike = tween(frame, word('idea.2', "doesn't") - 4, 20, ease.inOut);
  const verdict = rise(frame, word('idea.2', 'back') + 2, fps);
  const retire = tween(frame, i3.local - 14, 26, ease.inOut);

  const numeral = rise(frame, word('idea.3', '102') - 3, fps);
  const finding = rise(frame, word('idea.3', 'found') - 2, fps);
  const source = rise(frame, word('idea.3', 'cognitive'), fps);
  const summarize = tween(frame, i4.local - 12, 22, ease.inOut);

  const feel = rise(frame, i4.local, fps);
  const differs = rise(frame, word('idea.4', 'differs') - 2, fps);
  const plans = rise(frame, i5.local, fps);
  const mark = tween(frame, word('idea.5', 'log') - 6, 16, ease.out);
  const hint = rise(frame, word('idea.5', 'phase') - 2, fps);
  const settle = tween(frame, i5.local - 4, 20, ease.inOut);
  const exit = tween(frame, len - 12, 12, ease.in);

  // The assumption: a full-size quotation, then a small struck line at the top.
  const qScale = interpolate(retire, [0, 1], [1, 0.55]);
  const qTop = interpolate(retire, [0, 1], [356, 128]);

  return (
    <AbsoluteFill style={{ opacity: 1 - exit, transform: `translateY(${-16 * exit}px)` }}>
      <div style={{ position: 'absolute', left: LEFT, top: 296, ...EYEBROW, opacity: assumed * (1 - retire), transform: `translateY(${(1 - assumed) * 14 - retire * 40}px)` }}>
        What we assumed
      </div>

      <div style={{ position: 'absolute', left: LEFT, top: qTop, transformOrigin: '0 0', transform: `scale(${qScale})` }}>
        <div style={{ ...enter(assumed), position: 'relative', display: 'inline-block', whiteSpace: 'nowrap', font: `500 80px/1.1 ${FONT.serif}`, letterSpacing: '-0.026em', color: C.ink }}>
          <span style={{ opacity: interpolate(strike, [0, 1], [1, 0.5], CLAMP) }}>“The cycle changes how well you think.”</span>
          <span
            style={{
              position: 'absolute',
              left: -8,
              top: '54%',
              height: 6,
              width: `calc(${strike * 100}% + ${strike * 16}px)`,
              borderRadius: 3,
              background: C.ink,
              opacity: strike > 0 ? 0.85 : 0,
            }}
          />
        </div>
      </div>

      <div style={{ position: 'absolute', left: LEFT, top: 470, opacity: verdict * (1 - retire), transform: `translateY(${(1 - verdict) * 14}px)` }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 12, padding: '10px 20px', borderRadius: 99, border: `2px solid ${PHASE.menstrual.solid}`, color: PHASE.menstrual.solid, font: `600 26px/1 ${FONT.sans}`, letterSpacing: '-0.01em' }}>
          Not what the research found
        </span>
      </div>

      {/* The finding, large, with its source; it later folds into one line under the assumption. */}
      <div style={{ position: 'absolute', left: LEFT, top: 300, width: 1480, opacity: 1 - summarize, transform: `translateY(${-30 * summarize}px)` }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 44 }}>
          <div style={{ ...enter(numeral, 0, 30), font: `500 210px/0.86 ${FONT.serif}`, letterSpacing: '-0.04em', color: C.ink, fontVariantNumeric: 'lining-nums' }}>102</div>
          <div style={{ paddingTop: 8 }}>
            <div style={{ ...enter(numeral, 0, 14), ...EYEBROW, marginBottom: 18 }}>Studies, reviewed together</div>
            <div style={{ ...enter(finding), font: `500 60px/1.1 ${FONT.serif}`, letterSpacing: '-0.024em', color: C.ink, maxWidth: 1040, textWrap: 'balance' }}>
              No robust change in cognitive performance across the cycle.
            </div>
          </div>
        </div>
        <div style={{ ...enter(source, 0, 12), marginTop: 40, font: `500 26px/1.4 ${FONT.sans}`, color: C.ink2 }}>
          Jang et al., <i>PLOS ONE</i>, 2025. A meta-analysis of 102 studies and 3,943 people.
        </div>
      </div>

      <div style={{ position: 'absolute', left: LEFT, top: 206, opacity: summarize * (1 - 0.35 * settle), transform: `translateY(${(1 - summarize) * 24}px)`, font: `500 26px/1.4 ${FONT.sans}`, color: C.ink2 }}>
        102 studies: no robust change in cognitive performance. <span style={{ color: C.ink3 }}>Jang et al., <i>PLOS ONE</i>, 2025</span>
      </div>
      <div style={{ position: 'absolute', left: LEFT, top: 276, width: 1480, height: 1, background: C.line, opacity: summarize, transformOrigin: '0 0', transform: `scaleX(${summarize})` }} />

      <div style={{ position: 'absolute', left: LEFT, top: 336, width: 1480 }}>
        <div style={{ ...enter(feel, settle * 0.75), font: `500 84px/1.08 ${FONT.serif}`, letterSpacing: '-0.028em', color: C.ink }}>How you feel can change,</div>
        <div style={{ ...enter(differs, settle * 0.75), marginTop: 14, font: `500 54px/1.1 ${FONT.serif}`, letterSpacing: '-0.022em', color: C.ink2 }}>and it differs from person to person.</div>
      </div>

      <div style={{ position: 'absolute', left: LEFT, top: 604, width: 1480 }}>
        <div style={{ ...enter(plans), font: `500 84px/1.08 ${FONT.serif}`, letterSpacing: '-0.028em', color: C.ink, whiteSpace: 'nowrap' }}>
          So Cadence plans around{' '}
          <span style={{ backgroundImage: `linear-gradient(${PHASE.luteal.tint}, ${PHASE.luteal.tint})`, backgroundRepeat: 'no-repeat', backgroundPosition: '0 88%', backgroundSize: `${mark * 100}% 0.22em` }}>what you log.</span>
        </div>
        <div style={{ ...enter(hint, 0, 14), marginTop: 22, font: `500 34px/1.3 ${FONT.sans}`, letterSpacing: '-0.012em', color: C.ink2 }}>Your phase is only a hint.</div>
      </div>

      <Sfx at={word('idea.2', "doesn't") - 4} name="whoosh" gain={0.55} />
      <Sfx at={word('idea.3', '102') - 3} name="tick" />
    </AbsoluteFill>
  );
};
