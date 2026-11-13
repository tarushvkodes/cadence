import { motion } from 'motion/react';
import { useId } from 'react';

export function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: readonly { value: T; label: string }[]; onChange: (v: T) => void }) {
  const id = useId();
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map((o) => {
        const checked = o.value === value;
        return (
          <button key={o.value} type="button" role="radio" aria-checked={checked} onClick={() => onChange(o.value)}>
            {checked ? <motion.span layoutId={`${id}-lens`} className="seg-lens" transition={{ type: 'spring', bounce: 0.15, duration: 0.35 }} /> : null}
            <span>{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function Stepper({ label, value, min, max, unit, onChange }: { label: string; value: number; min: number; max: number; unit: string; onChange: (v: number) => void }) {
  return (
    <div className="stepper" role="group" aria-label={label}>
      <button type="button" aria-label={`Fewer ${unit}`} disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))}>
        −
      </button>
      <output className="num" aria-live="polite">
        {value} <span className="muted">{unit}</span>
      </output>
      <button type="button" aria-label={`More ${unit}`} disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))}>
        +
      </button>
    </div>
  );
}
