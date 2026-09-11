/**
 * Walks up the DOM tree to identify the effective backdrop behind the element
 */
export function extractParentBackdrop(el: HTMLElement): string {
  let current: HTMLElement | null = el.parentElement;

  while (current && current !== document.documentElement) {
    const comp = window.getComputedStyle(current);
    const bg = comp.backgroundColor;
    const bgImg = comp.backgroundImage;

    if (bgImg && bgImg !== 'none') {
      return bgImg;
    }

    if (bg && bg !== 'transparent' && bg !== 'rgba(0, 0, 0, 0)') {
      return bg;
    }

    current = current.parentElement;
  }

  return '#0a0d14'; // Default dark fallback
}

export interface BackdropColor {
  /** Computed background-color string of the nearest opaque ancestor, or null. */
  color: string | null;
  /** True if a gradient or image was painted between the element and that colour. */
  behindGradient: boolean;
}

/**
 * Finds the nearest ancestor with an OPAQUE background colour, for contrast maths.
 *
 * Deliberately different from extractParentBackdrop: that one stops at the first
 * gradient it meets, which is right for showing a designer the backdrop but useless
 * for computing a ratio, since a gradient string cannot be parsed into a colour. A
 * page with a gradient on <body> would otherwise fall back to "assume white", which
 * inverts the verdict on every dark page.
 *
 * Reports whether a gradient sits in between so the caller can mark the result
 * approximate rather than presenting it as exact.
 */
export function findBackdropColor(el: HTMLElement): BackdropColor {
  let current: HTMLElement | null = el.parentElement;
  let behindGradient = false;

  while (current) {
    const comp = window.getComputedStyle(current);

    if (comp.backgroundImage && comp.backgroundImage !== 'none') {
      behindGradient = true;
    }

    const bg = comp.backgroundColor;
    if (bg && bg !== 'transparent' && bg !== 'rgba(0, 0, 0, 0)') {
      // Only opaque colours can terminate the walk; translucent ones let the
      // surface below show through and must keep compositing upward.
      const alpha = bg.startsWith('rgba') ? Number.parseFloat(bg.split(',')[3] || '1') : 1;
      if (alpha >= 1) {
        return { color: bg, behindGradient };
      }
    }

    if (current === document.documentElement) break;
    current = current.parentElement;
  }

  return { color: null, behindGradient };
}
