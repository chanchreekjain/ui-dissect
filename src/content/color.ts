export interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

const NAMED: Record<string, string> = {
  transparent: 'rgba(0,0,0,0)',
  black: 'rgb(0,0,0)',
  white: 'rgb(255,255,255)'
};

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function parseChannel(raw: string): number | null {
  const s = raw.trim();
  if (!s) return null;
  if (s.endsWith('%')) {
    const pct = Number.parseFloat(s.slice(0, -1));
    return Number.isFinite(pct) ? clamp(Math.round((pct / 100) * 255), 0, 255) : null;
  }
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? clamp(Math.round(n), 0, 255) : null;
}

function parseAlpha(raw: string): number {
  const s = raw.trim();
  if (s.endsWith('%')) {
    const pct = Number.parseFloat(s.slice(0, -1));
    return Number.isFinite(pct) ? clamp(pct / 100, 0, 1) : 1;
  }
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? clamp(n, 0, 1) : 1;
}

/**
 * Parses the colour forms getComputedStyle actually returns (rgb/rgba), plus hex
 * and a few keywords. Returns null for anything it cannot read with certainty --
 * callers must treat null as "unknown", never as a default colour.
 */
export function parseColor(input: string | null | undefined): RGBA | null {
  if (!input) return null;
  let str = input.trim().toLowerCase();
  if (NAMED[str]) str = NAMED[str];

  const fn = str.match(/^rgba?\(([^)]*)\)$/);
  if (fn) {
    const parts = fn[1].split(/[\s,/]+/).filter(Boolean);
    if (parts.length < 3) return null;
    const r = parseChannel(parts[0]);
    const g = parseChannel(parts[1]);
    const b = parseChannel(parts[2]);
    if (r === null || g === null || b === null) return null;
    return { r, g, b, a: parts.length > 3 ? parseAlpha(parts[3]) : 1 };
  }

  const hex = str.match(/^#([0-9a-f]{3,8})$/);
  if (hex) {
    let h = hex[1];
    if (h.length === 3 || h.length === 4) {
      h = h.split('').map((c) => c + c).join('');
    }
    if (h.length !== 6 && h.length !== 8) return null;
    return {
      r: Number.parseInt(h.slice(0, 2), 16),
      g: Number.parseInt(h.slice(2, 4), 16),
      b: Number.parseInt(h.slice(4, 6), 16),
      a: h.length === 8 ? Number.parseInt(h.slice(6, 8), 16) / 255 : 1
    };
  }

  return null;
}

export function toHex(c: RGBA): string {
  const h = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0');
  return `#${h(c.r)}${h(c.g)}${h(c.b)}`;
}

export function toCssColor(c: RGBA): string {
  const r = Math.round(c.r);
  const g = Math.round(c.g);
  const b = Math.round(c.b);
  return c.a >= 1 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${Number(c.a.toFixed(3))})`;
}

/** Standard source-over alpha compositing of fg onto bg. */
export function compositeOver(fg: RGBA, bg: RGBA): RGBA {
  const a = fg.a + bg.a * (1 - fg.a);
  if (a <= 0) return { r: 0, g: 0, b: 0, a: 0 };
  return {
    r: (fg.r * fg.a + bg.r * bg.a * (1 - fg.a)) / a,
    g: (fg.g * fg.a + bg.g * bg.a * (1 - fg.a)) / a,
    b: (fg.b * fg.a + bg.b * bg.a * (1 - fg.a)) / a,
    a
  };
}

/** WCAG 2.1 relative luminance. */
export function relativeLuminance(c: RGBA): number {
  const ch = (v: number) => {
    const s = clamp(v, 0, 255) / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * ch(c.r) + 0.7152 * ch(c.g) + 0.0722 * ch(c.b);
}

/** WCAG 2.1 contrast ratio, 1 to 21. */
export function contrastRatio(a: RGBA, b: RGBA): number {
  const l1 = relativeLuminance(a);
  const l2 = relativeLuminance(b);
  const hi = Math.max(l1, l2);
  const lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}

/** WCAG "large text": >= 24px, or >= 18.66px when bold. */
export function isLargeText(fontSizePx: number, fontWeight: string | number): boolean {
  const weight = Number.parseInt(String(fontWeight), 10) || 400;
  if (fontSizePx >= 24) return true;
  return fontSizePx >= 18.66 && weight >= 700;
}

export interface ContrastVerdict {
  ratio: number;
  large: boolean;
  aa: boolean;
  aaa: boolean;
}

export function judgeContrast(
  text: RGBA,
  background: RGBA,
  fontSizePx: number,
  fontWeight: string | number
): ContrastVerdict {
  const large = isLargeText(fontSizePx, fontWeight);
  const ratio = contrastRatio(text, background);
  return {
    ratio,
    large,
    aa: ratio >= (large ? 3 : 4.5),
    aaa: ratio >= (large ? 4.5 : 7)
  };
}
