import { useId, useLayoutEffect, useRef, useState, type AnchorHTMLAttributes, type CSSProperties, type ElementType, type HTMLAttributes, type ReactNode } from 'react';

/**
 * Liquid Glass for the control layer only: nav, toolbars, sheets, the composer, proposal bars.
 *
 * In Chromium the backdrop is refracted through an SVG displacement map: content bends outward at
 * the rim like the edge of a lens, with a faint colour split, the way the team's liquid-glass spec
 * describes (refraction profile after liquid-glass-js by Armagan Amcalar, MIT). Other browsers get
 * a frosted blur with the same rim light, which reads as glass without the lensing.
 */

const supportsRefraction = (() => {
  if (typeof navigator === 'undefined' || typeof CSS === 'undefined') return false;
  const brands = (navigator as Navigator & { userAgentData?: { brands?: { brand: string }[] } }).userAgentData?.brands ?? [];
  const chromium = brands.some((b) => /Chromium|Google Chrome|Microsoft Edge/.test(b.brand));
  return chromium && CSS.supports('backdrop-filter', 'url(#a)');
})();

const MAX_SHIFT = 26;
const mapCache = new Map<string, string>();

/** Red = sideways shift, green = vertical shift, 128 = none. Strong in a band at the rim, nothing inside. */
function displacementMap(w: number, h: number, r: number, bend: number): string {
  const key = `${w}x${h}r${r}b${bend}`;
  const cached = mapCache.get(key);
  if (cached) return cached;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  const img = ctx.createImageData(w, h);
  const cx = w / 2;
  const cy = h / 2;
  const radius = Math.min(r, cx, cy);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const qx = Math.abs(x + 0.5 - cx) - (cx - radius);
      const qy = Math.abs(y + 0.5 - cy) - (cy - radius);
      const outside = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - radius;
      const depth = Math.max(-outside, 0);
      let nx: number;
      let ny: number;
      if (qx > 0 && qy > 0) {
        const len = Math.hypot(qx, qy) || 1;
        nx = (Math.sign(x + 0.5 - cx) * qx) / len;
        ny = (Math.sign(y + 0.5 - cy) * qy) / len;
      } else if (qx > qy) {
        nx = Math.sign(x + 0.5 - cx);
        ny = 0;
      } else {
        nx = 0;
        ny = Math.sign(y + 0.5 - cy);
      }
      const shift = bend * MAX_SHIFT * (0.62 * Math.exp(-0.16 * depth) + 0.38 * Math.exp(-0.55 * depth));
      const i = (y * w + x) * 4;
      img.data[i] = Math.round(128 + (127 * nx * shift) / MAX_SHIFT);
      img.data[i + 1] = Math.round(128 + (127 * ny * shift) / MAX_SHIFT);
      img.data[i + 2] = 128;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const url = canvas.toDataURL('image/png');
  mapCache.set(key, url);
  return url;
}

type GlassProps = HTMLAttributes<HTMLElement> & AnchorHTMLAttributes<HTMLAnchorElement> & {
  as?: ElementType;
  radius?: number;
  /** 0 = flat, 1 = default lens strength. */
  bend?: number;
  frost?: number;
  children?: ReactNode;
};

export function Glass({ as: Tag = 'div', radius = 28, bend = 1, frost = 10, className, style, children, ...rest }: GlassProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const filterId = `lg${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  useLayoutEffect(() => {
    if (!supportsRefraction || !ref.current) return;
    const el = ref.current;
    const measure = () => {
      const w = Math.round(el.offsetWidth);
      const h = Math.round(el.offsetHeight);
      setSize((s) => (s && s.w === w && s.h === h ? s : w && h ? { w, h } : null));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const map = size ? displacementMap(size.w, size.h, radius, bend) : null;
  const refracting = Boolean(map);
  const glassStyle: CSSProperties = {
    ...style,
    ['--glass-radius' as string]: `${radius}px`,
    ['--glass-frost' as string]: `${frost}px`,
    ...(refracting ? { backdropFilter: `url(#${filterId}) blur(${frost}px) saturate(1.65) brightness(1.03)` } : {}),
  };

  return (
    <Tag ref={ref} className={`glass${className ? ` ${className}` : ''}`} data-refract={refracting || undefined} style={glassStyle} {...rest}>
      {map && size ? (
        <svg className="glass-defs" width="0" height="0" aria-hidden="true" focusable="false">
          <filter id={filterId} x="0" y="0" width={size.w} height={size.h} filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
            <feImage href={map} x="0" y="0" width={size.w} height={size.h} preserveAspectRatio="none" result="map" />
            <feDisplacementMap in="SourceGraphic" in2="map" scale={MAX_SHIFT * 2} xChannelSelector="R" yChannelSelector="G" result="dR" />
            <feDisplacementMap in="SourceGraphic" in2="map" scale={MAX_SHIFT * 2 * 0.94} xChannelSelector="R" yChannelSelector="G" result="dG" />
            <feDisplacementMap in="SourceGraphic" in2="map" scale={MAX_SHIFT * 2 * 0.88} xChannelSelector="R" yChannelSelector="G" result="dB" />
            <feColorMatrix in="dR" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r" />
            <feColorMatrix in="dG" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="g" />
            <feColorMatrix in="dB" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="b" />
            <feComposite in="r" in2="g" operator="arithmetic" k2="1" k3="1" result="rg" />
            <feComposite in="rg" in2="b" operator="arithmetic" k2="1" k3="1" />
          </filter>
        </svg>
      ) : null}
      {children}
    </Tag>
  );
}
